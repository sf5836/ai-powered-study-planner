import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectMongo } from "../../src/config/mongo.js";
import { PlannerSession } from "../../src/models/PlannerSession.js";
import { RefreshToken } from "../../src/models/RefreshToken.js";
import { Report } from "../../src/models/Report.js";
import { SessionFocusPoint } from "../../src/models/SessionFocusPoint.js";
import { StudySession } from "../../src/models/StudySession.js";
import { Subject } from "../../src/models/Subject.js";
import { Topic } from "../../src/models/Topic.js";
import { UserPreference } from "../../src/models/UserPreference.js";
import { User } from "../../src/models/User.js";

const app = createApp();
const createdUserIds = [];

before(async () => {
  await connectMongo();
});

after(async () => {
  if (createdUserIds.length > 0) {
    const filter = { userId: { $in: createdUserIds } };
    await Promise.all([
      Report.deleteMany(filter),
      SessionFocusPoint.deleteMany(filter),
      StudySession.deleteMany(filter),
      PlannerSession.deleteMany(filter),
      Topic.deleteMany(filter),
      Subject.deleteMany(filter),
      UserPreference.deleteMany(filter),
      RefreshToken.deleteMany(filter),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }

  await mongoose.connection.close();
});

test("phase 7 cached summary and observability metrics endpoints", async () => {
  const signup = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 7 User",
    email: `phase7_${Date.now()}@example.com`,
    password: "password123",
  });

  assert.equal(signup.status, 201);
  const token = signup.body.accessToken;
  const userId = signup.body.user.id;
  createdUserIds.push(userId);

  const subject = await request(app)
    .post("/api/v1/subjects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "History", color: "#9333EA" });

  assert.equal(subject.status, 201);
  const subjectId = subject.body.item._id;

  const start = await request(app)
    .post("/api/v1/sessions/start")
    .set("Authorization", `Bearer ${token}`)
    .send({ subjectId, topicName: "World War II" });

  assert.equal(start.status, 201);
  const sessionId = start.body.item._id;

  await request(app)
    .post(`/api/v1/sessions/${sessionId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      secondOffset: 0,
      elapsedSeconds: 0,
      lookingAway: false,
      yawning: false,
      slouching: false,
      phoneDetected: false,
      alertLevel: 0,
      calibrationSeconds: 8,
    });

  await request(app)
    .post(`/api/v1/sessions/${sessionId}/end`)
    .set("Authorization", `Bearer ${token}`)
    .send({ notes: "Phase 7 check" });

  const summary1 = await request(app)
    .get("/api/v1/reports/summary?range=7d&subjectId=all")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(summary1.status, 200);
  assert.equal(summary1.body.cached, false);
  assert.ok(summary1.body.sessionsCount >= 1);

  const summary2 = await request(app)
    .get("/api/v1/reports/summary?range=7d&subjectId=all")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(summary2.status, 200);
  assert.equal(summary2.body.cached, true);

  const metrics = await request(app)
    .get("/api/v1/observability/metrics")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(metrics.status, 200);
  assert.ok(metrics.body.metrics.totals.totalRequests > 0);
  assert.ok(Object.hasOwn(metrics.body.metrics.latency, "p95Ms"));
  assert.ok(Array.isArray(metrics.body.metrics.routes));
});
