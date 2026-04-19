import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectMongo } from "../../src/config/mongo.js";
import { RefreshToken } from "../../src/models/RefreshToken.js";
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
      SessionFocusPoint.deleteMany(filter),
      StudySession.deleteMany(filter),
      Topic.deleteMany(filter),
      Subject.deleteMany(filter),
      UserPreference.deleteMany(filter),
      RefreshToken.deleteMany(filter),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }

  await mongoose.connection.close();
});

test("phase 4 AI inference is exposed and stored through session event flow", async () => {
  const inference = await request(app).post("/api/v1/ai/inference").send({
    signals: {
      lookingAway: true,
      yawning: false,
      slouching: true,
      phoneDetected: false,
      elapsedSeconds: 14,
      alertLevel: 1,
      calibrationSeconds: 9,
    },
  });

  assert.equal(inference.status, 200);
  assert.ok(inference.body.inference);
  assert.equal(typeof inference.body.inference.focus.score, "number");
  assert.equal(typeof inference.body.inference.readiness.score, "number");
  assert.equal(typeof inference.body.inference.emotion.label, "string");

  const signup = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 4 User",
    email: `phase4_${Date.now()}@example.com`,
    password: "password123",
  });

  assert.equal(signup.status, 201);
  const token = signup.body.accessToken;
  createdUserIds.push(signup.body.user.id);

  const subjectCreate = await request(app)
    .post("/api/v1/subjects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Biology", color: "#0EA5E9" });

  assert.equal(subjectCreate.status, 201);
  const subjectId = subjectCreate.body.item._id;

  const start = await request(app)
    .post("/api/v1/sessions/start")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId,
      topicName: "Cell Division",
    });

  assert.equal(start.status, 201);
  const sessionId = start.body.item._id;

  const event = await request(app)
    .post(`/api/v1/sessions/${sessionId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      secondOffset: 12,
      elapsedSeconds: 12,
      lookingAway: true,
      yawning: false,
      slouching: true,
      phoneDetected: false,
      alertLevel: 2,
      calibrationSeconds: 8,
    });

  assert.equal(event.status, 201);
  assert.ok(event.body.inference);
  assert.equal(typeof event.body.inference.focusPercent, "number");
  assert.equal(typeof event.body.inference.readinessScore, "number");
  assert.equal(typeof event.body.inference.emotion, "string");

  const metrics = await request(app).get("/api/v1/ai/metrics/p95");
  assert.equal(metrics.status, 200);
  assert.ok(Object.hasOwn(metrics.body, "p95LatencyMs"));
  assert.ok(Object.hasOwn(metrics.body, "samples"));
});
