import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import request from "supertest";
import mongoose from "mongoose";
import { createApp } from "../../src/app.js";
import { connectMongo } from "../../src/config/mongo.js";
import { Notification } from "../../src/models/Notification.js";
import { RefreshToken } from "../../src/models/RefreshToken.js";
import { UserPreference } from "../../src/models/UserPreference.js";
import { User } from "../../src/models/User.js";

const app = createApp();
const createdUserIds = [];

before(async () => {
  await connectMongo();
});

after(async () => {
  if (createdUserIds.length > 0) {
    await Promise.all([
      Notification.deleteMany({ userId: { $in: createdUserIds } }),
      UserPreference.deleteMany({ userId: { $in: createdUserIds } }),
      RefreshToken.deleteMany({ userId: { $in: createdUserIds } }),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
  }

  await mongoose.connection.close();
});

test("phase 8 notifications CRUD is available", async () => {
  const signup = await request(app).post("/api/v1/auth/signup").send({
    fullName: "Phase 8 Notifications User",
    email: `phase8_notifications_${Date.now()}@example.com`,
    password: "password123",
  });

  assert.equal(signup.status, 201);
  const token = signup.body.accessToken;
  const userId = signup.body.user.id;
  createdUserIds.push(userId);

  const createRes = await request(app)
    .post("/api/v1/notifications")
    .set("Authorization", `Bearer ${token}`)
    .send({
      type: "deadline",
      title: "Deadline reminder",
      message: "Revise chapter 5 tonight",
      scheduledFor: new Date(Date.now() + 60_000).toISOString(),
    });

  assert.equal(createRes.status, 201);
  assert.equal(createRes.body.item.type, "deadline");

  const notificationId = createRes.body.item._id;

  const listRes = await request(app).get("/api/v1/notifications").set("Authorization", `Bearer ${token}`);

  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.items));
  assert.ok(listRes.body.items.length >= 1);

  const readRes = await request(app)
    .patch(`/api/v1/notifications/${notificationId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ status: "read" });

  assert.equal(readRes.status, 200);
  assert.equal(readRes.body.item.status, "read");

  const deleteRes = await request(app)
    .delete(`/api/v1/notifications/${notificationId}`)
    .set("Authorization", `Bearer ${token}`);

  assert.equal(deleteRes.status, 204);
});
