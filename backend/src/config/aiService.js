import axios from "axios";
import { env } from "./env.js";
import { logError, logInfo } from "./logger.js";

export const aiClient = axios.create({
  baseURL: env.aiServiceUrl,
  timeout: env.aiRequestTimeoutMs,
});

const latencyWindow = [];
const circuit = {
  failureCount: 0,
  openedAt: 0,
};

function nowMs() {
  return Date.now();
}

function canAttemptAi() {
  if (!circuit.openedAt) {
    return true;
  }

  const elapsed = nowMs() - circuit.openedAt;
  if (elapsed > env.aiCircuitOpenMs) {
    circuit.openedAt = 0;
    circuit.failureCount = 0;
    return true;
  }

  return false;
}

function markSuccess(latencyMs) {
  circuit.failureCount = 0;
  circuit.openedAt = 0;

  latencyWindow.push(latencyMs);
  while (latencyWindow.length > 500) {
    latencyWindow.shift();
  }
}

function markFailure(error) {
  circuit.failureCount += 1;
  if (circuit.failureCount >= env.aiCircuitFailureThreshold) {
    circuit.openedAt = nowMs();
    logError("ai_circuit_opened", {
      failures: circuit.failureCount,
      openMs: env.aiCircuitOpenMs,
      reason: error?.message || "unknown",
    });
  }
}

function isRetryable(error) {
  if (!error) {
    return false;
  }

  if (error.code === "ECONNABORTED" || error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
    return true;
  }

  const status = error.response?.status;
  return status >= 500;
}

async function postWithRetry(path, payload) {
  let lastError;

  for (let attempt = 1; attempt <= env.aiRequestRetries + 1; attempt += 1) {
    try {
      const response = await aiClient.post(path, payload);
      return response.data;
    } catch (error) {
      lastError = error;
      const retryable = isRetryable(error);
      if (!retryable || attempt > env.aiRequestRetries) {
        throw error;
      }
    }
  }

  throw lastError;
}

function fallbackInference(features = {}) {
  const lookingAway = Boolean(features.lookingAway);
  const yawning = Boolean(features.yawning);
  const slouching = Boolean(features.slouching);
  const phoneDetected = Boolean(features.phoneDetected);

  const distractions = [lookingAway, yawning, slouching, phoneDetected].filter(Boolean).length;
  const focusScore = Math.max(15, 88 - distractions * 18);

  let emotionLabel = "neutral";
  if (focusScore < 40) {
    emotionLabel = "frustrated";
  } else if (focusScore < 60) {
    emotionLabel = "confused";
  } else if (focusScore > 80) {
    emotionLabel = "happy";
  }

  const readiness = Math.max(20, Math.min(95, 78 - distractions * 10));

  return {
    source: "fallback",
    focus: {
      score: focusScore,
      modelVersion: "fallback-v1",
      schemaVersion: "v1",
    },
    emotion: {
      label: emotionLabel,
      confidence: Number((0.64 - distractions * 0.08).toFixed(2)),
      modelVersion: "fallback-v1",
      schemaVersion: "v1",
    },
    readiness: {
      score: readiness,
      modelVersion: "fallback-v1",
      schemaVersion: "v1",
    },
  };
}

export async function inferFromSignals(signals = {}) {
  const startedAt = nowMs();

  if (!canAttemptAi()) {
    return fallbackInference(signals);
  }

  const payload = {
    schemaVersion: "v1",
    modelVersion: "heuristic-v1",
    signals,
  };

  try {
    const [focus, emotion, readiness] = await Promise.all([
      postWithRetry("/focus/predict", payload),
      postWithRetry("/emotion/predict", payload),
      postWithRetry("/readiness/score", payload),
    ]);

    const latencyMs = nowMs() - startedAt;
    markSuccess(latencyMs);

    return {
      source: "ai-service",
      focus,
      emotion,
      readiness,
      latencyMs,
    };
  } catch (error) {
    markFailure(error);
    logError("ai_inference_failed", {
      errorMessage: error?.message || "unknown",
      status: error?.response?.status,
    });
    return fallbackInference(signals);
  }
}

function fallbackPlannerRecommendations(payload = {}) {
  const topics = Array.isArray(payload.topics) ? payload.topics : [];

  const ranked = [...topics]
    .map((topic) => {
      const urgency = Math.max(20, Math.min(100, 100 - Number(topic.deadlineDays || 0) * 5.5));
      const difficulty = Math.max(0, Math.min(100, (Number(topic.difficulty || 1) / 5) * 100));
      const preparationGap = Math.max(0, Math.min(100, 100 - Number(topic.preparationPercent || 0)));
      const preference = Math.max(0, Math.min(100, Number(topic.preference || 50)));
      const priorityScore = (urgency * 0.4) + (difficulty * 0.3) + (preparationGap * 0.2) + (preference * 0.1);
      return { ...topic, priorityScore: Number(priorityScore.toFixed(2)) };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore);

  const suggestions = ranked.map((topic, index) => ({
    topicId: String(topic.topicId),
    subjectId: String(topic.subjectId),
    topicName: String(topic.topicName),
    dayOffset: index % 7,
    startHour: 15,
    durationMinutes: 60,
    priorityScore: topic.priorityScore,
    strategy: "priority-focus-block",
  }));

  return {
    schemaVersion: "v1",
    modelVersion: "planner-fallback-v1",
    suggestions,
  };
}

export async function generatePlannerRecommendations(payload = {}) {
  const startedAt = nowMs();

  if (!canAttemptAi()) {
    return fallbackPlannerRecommendations(payload);
  }

  try {
    const response = await postWithRetry("/planner/generate", payload);
    const latencyMs = nowMs() - startedAt;
    markSuccess(latencyMs);
    return response;
  } catch (error) {
    markFailure(error);
    logError("ai_planner_generation_failed", {
      errorMessage: error?.message || "unknown",
      status: error?.response?.status,
    });
    return fallbackPlannerRecommendations(payload);
  }
}

export async function generateSessionReport(payload = {}) {
  const startedAt = nowMs();

  if (!canAttemptAi()) {
    return {
      session_id: String(payload.session_id || ""),
      status: "completed",
      summary: "Report generated locally due to AI service fallback.",
      markdown: "# Session Report\n\nAI service unavailable. Local fallback summary generated.",
      modelVersion: "reports-fallback-v1",
      schemaVersion: "v1",
    };
  }

  try {
    const response = await postWithRetry("/reports/generate", payload);
    markSuccess(nowMs() - startedAt);
    return response;
  } catch (error) {
    markFailure(error);
    logError("ai_report_generation_failed", {
      errorMessage: error?.message || "unknown",
      status: error?.response?.status,
    });

    return {
      session_id: String(payload.session_id || ""),
      status: "completed",
      summary: "Report generated locally due to AI service fallback.",
      markdown: "# Session Report\n\nAI service unavailable. Local fallback summary generated.",
      modelVersion: "reports-fallback-v1",
      schemaVersion: "v1",
    };
  }
}

export function getAiInferenceMetrics() {
  const sorted = [...latencyWindow].sort((a, b) => a - b);
  const index = sorted.length === 0 ? -1 : Math.floor(0.95 * (sorted.length - 1));
  const p95LatencyMs = index >= 0 ? sorted[index] : null;

  return {
    samples: latencyWindow.length,
    p95LatencyMs,
    circuitOpen: Boolean(circuit.openedAt),
    failureCount: circuit.failureCount,
  };
}

export async function checkAiService() {
  const response = await aiClient.get("/health");
  return response.data;
}

export function logAiMetricsSnapshot() {
  const metrics = getAiInferenceMetrics();
  logInfo("ai_metrics_snapshot", metrics);
  return metrics;
}
