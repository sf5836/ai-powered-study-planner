import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectMongo } from "../../src/config/mongo.js";
import { Report } from "../../src/models/Report.js";
import { RefreshToken } from "../../src/models/RefreshToken.js";
import { SessionFocusPoint } from "../../src/models/SessionFocusPoint.js";
import { StudySession } from "../../src/models/StudySession.js";
import { Subject } from "../../src/models/Subject.js";
import { Topic } from "../../src/models/Topic.js";
import { UserPreference } from "../../src/models/UserPreference.js";
import { User } from "../../src/models/User.js";
import { processReportJob } from "../../src/jobs/processors/report.processor.js";

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
      Topic.deleteMany(filter),
      Subject.deleteMany(filter),
      UserPreference.deleteMany(filter),
      RefreshToken.deleteMany(filter),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }

  await mongoose.connection.close();
});

test("phase 6 async report generation, status, download, and dead-letter behavior", async () => {
  const signup = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 6 User",
    email: `phase6_${Date.now()}@example.com`,
    password: "password123",
  });

  assert.equal(signup.status, 201);
  const token = signup.body.accessToken;
  const userId = signup.body.user.id;
  createdUserIds.push(userId);

  const subject = await request(app)
    .post("/api/v1/subjects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Chemistry", color: "#16A34A" });

  assert.equal(subject.status, 201);

  const start = await request(app)
    .post("/api/v1/sessions/start")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId: subject.body.item._id,
      topicName: "Acids and Bases",
    });

  assert.equal(start.status, 201);
  const sessionId = start.body.item._id;

  const event = await request(app)
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
      calibrationSeconds: 10,
    });

  assert.equal(event.status, 201);

  const end = await request(app)
    .post(`/api/v1/sessions/${sessionId}/end`)
    .set("Authorization", `Bearer ${token}`)
    .send({ notes: "Great study session" });

  assert.equal(end.status, 200);

  const initialStatus = await request(app)
    .get(`/api/v1/reports/${sessionId}/status`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(initialStatus.status, 200);
  assert.ok(["queued", "processing", "failed", "completed"].includes(initialStatus.body.item.status));

  const generated = await request(app)
    .post(`/api/v1/reports/${sessionId}/generate`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(generated.status, 202);

  const report = await Report.findOne({ userId, sessionId });
  assert.ok(report);

  await processReportJob({ id: String(report._id) });

  const finalStatus = await request(app)
    .get(`/api/v1/reports/${sessionId}/status`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(finalStatus.status, 200);
  assert.equal(finalStatus.body.item.status, "completed");

  const download = await request(app)
    .get(`/api/v1/reports/${sessionId}/download`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(download.status, 200);
  assert.ok(String(download.headers["content-type"] || "").includes("application/pdf"));

  const deadLetterReport = await Report.create({
    userId,
    sessionId: new mongoose.Types.ObjectId(),
    status: "failed",
    attempts: 3,
    maxAttempts: 3,
    nextRetryAt: new Date(Date.now() - 1000),
  });

  await processReportJob({ id: String(deadLetterReport._id) });

  const refreshedDeadLetter = await Report.findById(deadLetterReport._id);
  assert.equal(refreshedDeadLetter.status, "dead-letter");
});
