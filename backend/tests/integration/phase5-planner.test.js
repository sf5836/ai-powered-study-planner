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

test("phase 5 planner engine generates weighted weekly plan and saves planner sessions", async () => {
  const signup = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 5 User",
    email: `phase5_${Date.now()}@example.com`,
    password: "password123",
  });

  assert.equal(signup.status, 201);
  const token = signup.body.accessToken;
  const userId = signup.body.user.id;
  createdUserIds.push(userId);

  const subject = await request(app)
    .post("/api/v1/subjects")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Math", color: "#1D4ED8" });

  assert.equal(subject.status, 201);
  const subjectId = subject.body.item._id;

  const now = new Date();
  const inDays = (days) => {
    const date = new Date(now);
    date.setDate(now.getDate() + days);
    return date.toISOString();
  };

  const topicA = await request(app)
    .post("/api/v1/topics")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId,
      name: "Derivatives",
      deadline: inDays(1),
      difficulty: 5,
      preparationPercent: 10,
    });

  const topicB = await request(app)
    .post("/api/v1/topics")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId,
      name: "Integrals",
      deadline: inDays(5),
      difficulty: 3,
      preparationPercent: 55,
    });

  const topicC = await request(app)
    .post("/api/v1/topics")
    .set("Authorization", `Bearer ${token}`)
    .send({
      subjectId,
      name: "Linear Algebra",
      deadline: inDays(3),
      difficulty: 4,
      preparationPercent: 25,
    });

  assert.equal(topicA.status, 201);
  assert.equal(topicB.status, 201);
  assert.equal(topicC.status, 201);

  const generate = await request(app)
    .post("/api/v1/planner/generate")
    .set("Authorization", `Bearer ${token}`)
    .send({
      availableMinutesPerDay: 120,
      preferenceByTopic: {
        [topicA.body.item._id]: 80,
        [topicB.body.item._id]: 40,
        [topicC.body.item._id]: 65,
      },
    });

  assert.equal(generate.status, 201);
  assert.ok(generate.body.count >= 3);
  assert.equal(Array.isArray(generate.body.items), true);

  const generatedItems = generate.body.items;
  assert.equal(generatedItems[0].topicName, "Derivatives");
  assert.match(generatedItems[0].notes, /AI Generated/);

  const listSessions = await request(app)
    .get("/api/v1/planner/sessions?page=1&limit=20")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(listSessions.status, 200);
  assert.ok(listSessions.body.items.length >= 3);
  assert.ok(listSessions.body.items.some((item) => item.topicName === "Derivatives"));
});
