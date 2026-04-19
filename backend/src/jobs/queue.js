import { logError, logInfo } from "../config/logger.js";
import { Report } from "../models/Report.js";
import { processReportJob } from "./processors/report.processor.js";

let reportWorkerTimer = null;
let isWorkerBusy = false;

export async function enqueueReportJob(payload) {
  const userId = String(payload.userId || "");
  const sessionId = String(payload.sessionId || "");
  if (!userId || !sessionId) {
    throw new Error("enqueueReportJob requires userId and sessionId");
  }

  const report = await Report.findOneAndUpdate(
    { userId, sessionId },
    {
      $setOnInsert: {
        status: "queued",
        queuedAt: new Date(),
        nextRetryAt: new Date(),
      },
      $set: {
        deadLetterReason: "",
      },
    },
    { upsert: true, new: true }
  );

  return {
    queued: report.status === "queued" || report.status === "failed",
    report,
  };
}

async function processNextReportJob() {
  if (isWorkerBusy) {
    return;
  }

  isWorkerBusy = true;
  try {
    const now = new Date();
    const claim = await Report.findOneAndUpdate(
      {
        status: { $in: ["queued", "failed"] },
        nextRetryAt: { $lte: now },
        $expr: { $lt: ["$attempts", "$maxAttempts"] },
      },
      {
        $set: {
          status: "processing",
          startedAt: new Date(),
          lastError: "",
        },
        $inc: { attempts: 1 },
      },
      {
        sort: { queuedAt: 1 },
        new: true,
      }
    );

    if (!claim) {
      return;
    }

    await processReportJob({ id: String(claim._id) });
  } catch (error) {
    logError("report_worker_iteration_failed", {
      errorMessage: error?.message || "unknown",
    });
  } finally {
    isWorkerBusy = false;
  }
}

export function startReportWorker() {
  if (reportWorkerTimer) {
    return;
  }

  reportWorkerTimer = setInterval(() => {
    void processNextReportJob();
  }, 2000);

  reportWorkerTimer.unref?.();
  logInfo("report_worker_started", { intervalMs: 2000 });
}
