import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

test("phase 8 environment profiles and CI workflow are present", () => {
  const requiredFiles = [
    "../.github/workflows/ci.yml",
    ".env.development.example",
    ".env.staging.example",
    ".env.production.example",
    "../frontend/.env.development.example",
    "../frontend/.env.staging.example",
    "../frontend/.env.production.example",
    "../ai-service/.env.development.example",
    "../ai-service/.env.staging.example",
    "../ai-service/.env.production.example",
    "docs/runbook-backup-restore.md",
    "docs/runbook-incident-rollback.md",
  ];

  for (const filePath of requiredFiles) {
    assert.ok(existsSync(filePath), `Missing required phase 8 artifact: ${filePath}`);
  }
});

test("phase 8 CI workflow includes security scans", () => {
  const ciWorkflow = readFileSync("../.github/workflows/ci.yml", "utf-8");
  assert.match(ciWorkflow, /Security scan \(npm audit\)/);
  assert.match(ciWorkflow, /Security scan \(pip-audit\)/);
});
