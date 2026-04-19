import { Router } from "express";
import {
  aiClient,
  getAiInferenceMetrics,
  inferFromSignals,
  logAiMetricsSnapshot,
} from "../../config/aiService.js";

const router = Router();

router.post("/predict", async (req, res, next) => {
  try {
    const response = await aiClient.post("/predict", req.body);
    return res.json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return next(error);
  }
});

router.post("/inference", async (req, res, next) => {
  try {
    const signals = req.body?.signals || {};
    const inference = await inferFromSignals(signals);
    return res.json({ inference });
  } catch (error) {
    return next(error);
  }
});

router.get("/metrics", (_req, res) => {
  const metrics = logAiMetricsSnapshot();
  return res.json({ metrics });
});

router.get("/metrics/p95", (_req, res) => {
  const metrics = getAiInferenceMetrics();
  return res.json({
    p95LatencyMs: metrics.p95LatencyMs,
    samples: metrics.samples,
  });
});

export default router;
