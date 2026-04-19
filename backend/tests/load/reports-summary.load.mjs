const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const TOKEN = process.env.ACCESS_TOKEN || "";
const CONCURRENCY = Number(process.env.CONCURRENCY || 10);
const REQUESTS_PER_WORKER = Number(process.env.REQUESTS_PER_WORKER || 50);

if (!TOKEN) {
  console.error("Set ACCESS_TOKEN to run load test");
  process.exit(1);
}

function nowMs() {
  return Date.now();
}

async function runWorker() {
  const latencies = [];
  let failures = 0;

  for (let i = 0; i < REQUESTS_PER_WORKER; i += 1) {
    const started = nowMs();
    try {
      const response = await fetch(`${BASE_URL}/api/v1/reports/summary?range=7d&subjectId=all`, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
        },
      });
      if (!response.ok) {
        failures += 1;
      }
      await response.text();
    } catch {
      failures += 1;
    }
    latencies.push(nowMs() - started);
  }

  return { latencies, failures };
}

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor((sorted.length - 1) * fraction);
  return sorted[idx];
}

async function main() {
  const started = nowMs();
  const workers = Array.from({ length: CONCURRENCY }, () => runWorker());
  const results = await Promise.all(workers);

  const allLatencies = results.flatMap((entry) => entry.latencies);
  const failures = results.reduce((sum, entry) => sum + entry.failures, 0);
  const totalRequests = CONCURRENCY * REQUESTS_PER_WORKER;

  const durationSec = (nowMs() - started) / 1000;
  const rps = totalRequests / durationSec;

  console.log(
    JSON.stringify(
      {
        totalRequests,
        failures,
        failureRatePercent: Number(((failures / totalRequests) * 100).toFixed(2)),
        durationSec: Number(durationSec.toFixed(2)),
        rps: Number(rps.toFixed(2)),
        p50Ms: percentile(allLatencies, 0.5),
        p95Ms: percentile(allLatencies, 0.95),
      },
      null,
      2
    )
  );
}

main();
