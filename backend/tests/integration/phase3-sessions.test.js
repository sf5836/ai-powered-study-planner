import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectMongo } from "../../src/config/mongo.js";
import { PlannerSession } from "../../src/models/PlannerSession.js";
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
    const userFilter = { userId: { $in: createdUserIds } };

    await Promise.all([
      SessionFocusPoint.deleteMany(userFilter),
      StudySession.deleteMany(userFilter),
      PlannerSession.deleteMany(userFilter),
      Topic.deleteMany(userFilter),
      Subject.deleteMany(userFilter),
      UserPreference.deleteMany(userFilter),
      RefreshToken.deleteMany(userFilter),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }

  await mongoose.connection.close();
});

test("phase 3 live study session persistence and reports visibility", async () => {
  const signup = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 3 User",
    email: `phase3_${Date.now()}@example.com`,
    password: "password123",
  });

  assert.equal(signup.status, 201);
  const token = signup.body.accessToken;
  const userId = signup.body.user.id;
  createdUserIds.push(userId);

  const subjectCreate = await request(app)
    .post("/api/v1/subjects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Chemistry", color: "#DC2626" });

  assert.equal(subjectCreate.status, 201);
  const subjectId = subjectCreate.body.item._id;

  const topicCreate = await request(app)
    .post("/api/v1/topics")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId,
      name: "Organic Chemistry",
      deadline: new Date().toISOString(),
      difficulty: 3,
      preparationPercent: 25,
    });

  assert.equal(topicCreate.status, 201);
  const topicId = topicCreate.body.item._id;

  const start = await request(app)
    .post("/api/v1/sessions/start")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId,
      topicId,
      topicName: "Organic Chemistry",
    });

  assert.equal(start.status, 201);
  const studySessionId = start.body.item._id;

  const active = await request(app).get("/api/v1/sessions/active").set("Authorization", `Bearer ${token}`);
  assert.equal(active.status, 200);
  assert.equal(active.body.item._id, studySessionId);

  const event0 = await request(app)
    .post(`/api/v1/sessions/${studySessionId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      secondOffset: 0,
      focusPercent: 72,
      emotion: "neutral",
      confidence: 83,
      readinessScore: 68,
      alertLevel: 1,
    });

  assert.equal(event0.status, 201);

  const event30 = await request(app)
    .post(`/api/v1/sessions/${studySessionId}/events`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      secondOffset: 30,
      focusPercent: 66,
      emotion: "happy",
      confidence: 77,
      readinessScore: 71,
      alertLevel: 2,
    });

  assert.equal(event30.status, 201);

  const pause = await request(app)
    .post(`/api/v1/sessions/${studySessionId}/pause`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(pause.status, 200);
  assert.equal(pause.body.item.status, "paused");

  const resume = await request(app)
    .post(`/api/v1/sessions/${studySessionId}/resume`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(resume.status, 200);
  assert.equal(resume.body.item.status, "active");

  const end = await request(app)
    .post(`/api/v1/sessions/${studySessionId}/end`)
    .set("Authorization", `Bearer ${token}`)
    .send({ notes: "Great flow" });

  assert.equal(end.status, 200);
  assert.equal(end.body.item.status, "completed");
  assert.ok(end.body.item.durationMinutes >= 1);

  const reports = await request(app)
    .get(`/api/v1/reports/sessions?range=7d&subjectId=${subjectId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(reports.status, 200);
  assert.ok(Array.isArray(reports.body.items));
  assert.equal(reports.body.items.length, 1);
  assert.equal(reports.body.items[0].id, studySessionId);
  assert.ok(Array.isArray(reports.body.items[0].focusTimeline));
  assert.ok(reports.body.items[0].focusTimeline.length >= 2);

  const remove = await request(app)
    .delete(`/api/v1/reports/sessions/${studySessionId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(remove.status, 204);

  const reportsAfterDelete = await request(app)
    .get(`/api/v1/reports/sessions?range=7d&subjectId=${subjectId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(reportsAfterDelete.status, 200);
  assert.equal(reportsAfterDelete.body.items.length, 0);
});
