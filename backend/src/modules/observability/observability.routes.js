import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.js";
import { getRequestMetricsSnapshot } from "../../middleware/requestMetrics.middleware.js";

const router = Router();

router.get("/metrics", authMiddleware, (req, res) => {
  const snapshot = getRequestMetricsSnapshot();
  return res.json({
    requestId: req.requestId,
    metrics: snapshot,
  });
});

export default router;
