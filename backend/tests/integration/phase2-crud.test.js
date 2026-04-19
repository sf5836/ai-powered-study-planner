import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectMongo } from "../../src/config/mongo.js";
import { PlannerSession } from "../../src/models/PlannerSession.js";
import { RefreshToken } from "../../src/models/RefreshToken.js";
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

test("phase 2 subjects/topics/planner CRUD with ownership checks", async () => {
  const emailA = `phase2a_${Date.now()}@example.com`;
  const signupA = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 2 User A",
    email: emailA,
    password: "password123",
  });

  assert.equal(signupA.status, 201);
  const tokenA = signupA.body.accessToken;
  const userAId = signupA.body.user.id;
  createdUserIds.push(userAId);

  const subjectCreate = await request(app)
    .post("/api/v1/subjects")
    .set("Authorization", `Bearer ${tokenA}`)
    .send({ name: "Physics", color: "#2563EB" });

  assert.equal(subjectCreate.status, 201);
  const subjectId = subjectCreate.body.item._id;

  const subjectList = await request(app)
    .get("/api/v1/subjects?page=1&limit=10")
    .set("Authorization", `Bearer ${tokenA}`);

  assert.equal(subjectList.status, 200);
  assert.ok(Array.isArray(subjectList.body.items));
  assert.ok(subjectList.body.items.some((item) => item._id === subjectId));

  const subjectUpdate = await request(app)
    .patch(`/api/v1/subjects/${subjectId}`)
    .set("Authorization", `Bearer ${tokenA}`)
    .send({ name: "Advanced Physics" });

  assert.equal(subjectUpdate.status, 200);
  assert.equal(subjectUpdate.body.item.name, "Advanced Physics");

  const topicCreate = await request(app)
    .post("/api/v1/topics")
    .set("Authorization", `Bearer ${tokenA}`)
    .send({
      subjectId,
      name: "Newton's Laws",
      deadline: new Date().toISOString(),
      difficulty: 4,
      preparationPercent: 30,
    });

  assert.equal(topicCreate.status, 201);
  const topicId = topicCreate.body.item._id;

  const topicList = await request(app)
    .get(`/api/v1/topics?subjectId=${subjectId}&page=1&limit=10`)
    .set("Authorization", `Bearer ${tokenA}`);

  assert.equal(topicList.status, 200);
  assert.ok(topicList.body.items.some((item) => item._id === topicId));

  const topicUpdate = await request(app)
    .patch(`/api/v1/topics/${topicId}`)
    .set("Authorization", `Bearer ${tokenA}`)
    .send({ preparationPercent: 60 });

  assert.equal(topicUpdate.status, 200);
  assert.equal(topicUpdate.body.item.preparationPercent, 60);

  const plannerCreate = await request(app)
    .post("/api/v1/planner/sessions")
    .set("Authorization", `Bearer ${tokenA}`)
    .send({
      subjectId,
      topicId,
      topicName: "Newton's Laws",
      date: new Date().toISOString(),
      startHour: 15,
      durationMinutes: 60,
      notes: "Phase 2 test session",
    });

  assert.equal(plannerCreate.status, 201);
  const plannerId = plannerCreate.body.item._id;

  const plannerList = await request(app)
    .get("/api/v1/planner/sessions?page=1&limit=10")
    .set("Authorization", `Bearer ${tokenA}`);

  assert.equal(plannerList.status, 200);
  assert.ok(plannerList.body.items.some((item) => item._id === plannerId));

  const plannerUpdate = await request(app)
    .patch(`/api/v1/planner/sessions/${plannerId}`)
    .set("Authorization", `Bearer ${tokenA}`)
    .send({ durationMinutes: 90 });

  assert.equal(plannerUpdate.status, 200);
  assert.equal(plannerUpdate.body.item.durationMinutes, 90);

  const emailB = `phase2b_${Date.now()}@example.com`;
  const signupB = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 2 User B",
    email: emailB,
    password: "password123",
  });

  assert.equal(signupB.status, 201);
  const tokenB = signupB.body.accessToken;
  const userBId = signupB.body.user.id;
  createdUserIds.push(userBId);

  const forbiddenUpdate = await request(app)
    .patch(`/api/v1/subjects/${subjectId}`)
    .set("Authorization", `Bearer ${tokenB}`)
    .send({ name: "Hacked Subject" });

  assert.equal(forbiddenUpdate.status, 404);

  const plannerDelete = await request(app)
    .delete(`/api/v1/planner/sessions/${plannerId}`)
    .set("Authorization", `Bearer ${tokenA}`);

  assert.equal(plannerDelete.status, 204);

  const topicDelete = await request(app)
    .delete(`/api/v1/topics/${topicId}`)
    .set("Authorization", `Bearer ${tokenA}`);

  assert.equal(topicDelete.status, 204);

  const subjectDelete = await request(app)
    .delete(`/api/v1/subjects/${subjectId}`)
    .set("Authorization", `Bearer ${tokenA}`);

  assert.equal(subjectDelete.status, 204);
});
