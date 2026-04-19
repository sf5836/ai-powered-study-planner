import test from "node:test";
import assert from "node:assert/strict";
import { env } from "../../src/config/env.js";

test("env defaults are available", () => {
  assert.ok(env.port > 0);
  assert.ok(env.mongoUri);
  assert.ok(env.jwtAccessSecret);
  assert.ok(env.jwtRefreshSecret);
});
