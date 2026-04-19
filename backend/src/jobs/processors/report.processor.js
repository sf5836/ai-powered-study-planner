import fs from "node:fs/promises";
import path from "node:path";
import { generateSessionReport } from "../../config/aiService.js";
import { logError } from "../../config/logger.js";
import { Report } from "../../models/Report.js";
import { StudySession } from "../../models/StudySession.js";

function reportFileName(sessionId) {
  return `study-report-${sessionId}.pdf`;
}

function buildFallbackSummary(session) {
  return [
    `Session Topic: ${session.topicName}`,
    `Duration: ${session.durationMinutes} minutes`,
    `Average Focus: ${session.avgFocusPercent}%`,
    `Readiness: ${session.readinessScore}%`,
    `Alerts (L1/L2/L3): ${session.alertCountL1}/${session.alertCountL2}/${session.alertCountL3}`,
  ].join("\n");
}

async function writePseudoPdf(filePath, title, summary) {
  const content = [
    "%PDF-1.1",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Count 1 /Kids [3 0 R] >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >> endobj",
    `4 0 obj << /Length ${summary.length + title.length + 120} >> stream`,
    "BT /F1 12 Tf 72 740 Td",
    `(${title.replace(/[()]/g, "")}) Tj`,
    "0 -22 Td",
    `(${summary.replace(/[()]/g, "")}) Tj`,
    "ET",
    "endstream endobj",
    "xref",
    "0 5",
    "0000000000 65535 f ",
    "0000000010 00000 n ",
    "0000000062 00000 n ",
    "0000000114 00000 n ",
    "0000000224 00000 n ",
    "trailer << /Size 5 /Root 1 0 R >>",
    "startxref",
    "400",
    "%%EOF",
  ].join("\n");

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function processReportJob(job) {
  const report = await Report.findById(job.id);
  if (!report) {
    return;
  }

  try {
    const session = await StudySession.findOne({ _id: report.sessionId, userId: report.userId });
    if (!session) {
      throw new Error("Study session not found for report generation");
    }

    const aiResult = await generateSessionReport({
      session_id: String(session._id),
      duration_minutes: session.durationMinutes,
      avg_focus_percent: session.avgFocusPercent,
      readiness_score: session.readinessScore,
      topic_name: session.topicName,
      notes: session.notes,
    });

    const summary = aiResult.summary || buildFallbackSummary(session);
    const fileName = reportFileName(String(session._id));
    const filePath = path.resolve(process.cwd(), "storage", "reports", fileName);

    await writePseudoPdf(filePath, `FocusIQ Report - ${session.topicName}`, summary);

    report.status = "completed";
    report.summary = String(summary).slice(0, 8000);
    report.fileName = fileName;
    report.filePath = filePath;
    report.completedAt = new Date();
    report.lastError = "";
    report.deadLetterReason = "";
    await report.save();
  } catch (error) {
    const nextAttempts = report.attempts;
    const retriesLeft = report.maxAttempts - nextAttempts;

    if (retriesLeft <= 0) {
      report.status = "dead-letter";
      report.deadLetterReason = (error?.message || "unknown").slice(0, 1000);
      report.lastError = report.deadLetterReason;
      report.nextRetryAt = new Date(Date.now() + 86400000);
    } else {
      report.status = "failed";
      report.lastError = (error?.message || "unknown").slice(0, 1000);
      const backoffMs = Math.min(60000, 1000 * 2 ** nextAttempts);
      report.nextRetryAt = new Date(Date.now() + backoffMs);
    }

    await report.save();
    logError("report_job_failed", {
      reportId: String(report._id),
      attempts: report.attempts,
      status: report.status,
      errorMessage: error?.message || "unknown",
    });
  }
}
