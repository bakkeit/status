import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  validateSnapshot,
  serverState,
  usedPercent,
  uptime,
} from "../site/model.js";
const baseline = JSON.parse(
  await readFile(new URL("../site/status.json", import.meta.url)),
);
export function sample() {
  const data = structuredClone(baseline);
  data.generated_at = "2026-10-25T14:00:00Z";
  data.servers[0].observed_at = data.generated_at;
  data.servers[0].metrics = {
    cpu_percent: 12.5,
    memory_total_bytes: 8 * 1024 ** 3,
    memory_available_bytes: 6 * 1024 ** 3,
    disks: [
      {
        label: "System",
        total_bytes: 100 * 1024 ** 3,
        available_bytes: 40 * 1024 ** 3,
      },
    ],
    os_name: "Ubuntu",
    os_version: "22.04",
    uptime_seconds: 1234567,
  };
  return data;
}
test("initial state and partial host failure are supported", () => {
  assert.equal(validateSnapshot(baseline), baseline);
  validateSnapshot(sample());
  assert.equal(serverState(baseline.servers[0]), "unavailable");
});
test("fresh, stale and future measurements are distinguished", () => {
  const host = sample().servers[0];
  const observed = Date.parse(host.observed_at);
  assert.equal(serverState(host, observed + 60_000), "fresh");
  assert.equal(serverState(host, observed + 15 * 60_000 + 1), "stale");
  assert.equal(serverState(host, observed - 120_000), "stale");
});
test("Linux available memory and uptime have the expected meaning", () => {
  assert.equal(usedPercent(8000, 6000), 25);
  assert.equal(uptime(90061), "1 d 1 t");
  assert.equal(uptime(61), "0 t 1 min");
});
test("unknown fields, private data and unsafe labels are rejected", () => {
  for (const mutate of [
    (d) => {
      d.private_ip = "10.10.0.20";
    },
    (d) => {
      d.servers[0].metrics.mounts = ["/private"];
    },
    (d) => {
      d.servers[0].metrics.disks[0].label = "/mnt/private";
    },
    (d) => {
      d.servers[0].metrics.os_name = "<script>";
    },
    (d) => {
      d.servers[1] = structuredClone(d.servers[0]);
    },
    (d) => {
      d.servers[0].metrics.cpu_percent = 101;
    },
    (d) => {
      d.servers[0].metrics.memory_available_bytes = Infinity;
    },
    (d) => {
      d.servers[0].metrics.disks[0].available_bytes = -1;
    },
    (d) => {
      d.servers[0].metrics.disks = [];
    },
    (d) => {
      d.servers[0].observed_at = "invalid";
    },
    (d) => {
      d.servers[0].metrics.memory_available_bytes =
        d.servers[0].metrics.memory_total_bytes + 1;
    },
  ]) {
    const data = sample();
    mutate(data);
    assert.throws(() => validateSnapshot(data));
  }
});
