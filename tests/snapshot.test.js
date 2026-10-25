import { test } from "node:test";
import assert from "node:assert/strict";
import { prepareSnapshot } from "../scripts/snapshot.mjs";
import { serverState } from "../site/model.js";
const now = Date.parse("2026-10-25T22:00:00Z");
function sample(time = now) {
  return {
    version: 1,
    generated_at: new Date(time).toISOString(),
    servers: [
      {
        id: "mx",
        name: "mx.bakkeit.email",
        observed_at: new Date(time).toISOString(),
        metrics: {
          cpu_percent: 1,
          memory_total_bytes: 8000,
          memory_available_bytes: 6000,
          disks: [{ label: "System", total_bytes: 1000, available_bytes: 500 }],
          os_name: "Ubuntu",
          os_version: "22.04",
          uptime_seconds: 100,
        },
      },
      {
        id: "storage",
        name: "storage.bakkeit.cloud",
        observed_at: null,
        metrics: null,
      },
    ],
  };
}
const fetched = (value) => async () => ({
  ok: true,
  text: async () => JSON.stringify(value),
});
test("collector snapshots are published without making a network request", async () => {
  const data = sample();
  assert.deepEqual(
    await prepareSnapshot(JSON.stringify(data), {
      now,
      fetchSnapshot: () => {
        throw Error("No fetch expected");
      },
    }),
    data,
  );
});
test("source-only and manual empty-input deploys preserve real values and timestamps", async () => {
  const old = sample(now - 3600000);
  const data = await prepareSnapshot("", { now, fetchSnapshot: fetched(old) });
  assert.deepEqual(data, old);
  assert.equal(serverState(data.servers[0], now), "stale");
});
test("failed fetch, empty bootstrap values and private fields cannot wipe the live snapshot", async () => {
  for (const fetchSnapshot of [
    async () => ({ ok: false }),
    async () => {
      throw Error("Network down");
    },
    fetched({ ...sample(), generated_at: null }),
    fetched({ ...sample(), private_ip: "private" }),
  ])
    await assert.rejects(prepareSnapshot("", { now, fetchSnapshot }));
});
test("stale newly supplied data is rejected, while stale preserved data remains visibly stale", async () => {
  await assert.rejects(
    prepareSnapshot(JSON.stringify(sample(now - 3600000)), { now }),
  );
  assert.deepEqual(
    await prepareSnapshot("", {
      now,
      fetchSnapshot: fetched(sample(now - 3600000)),
    }),
    sample(now - 3600000),
  );
});
