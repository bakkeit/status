import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
const preview = spawn(process.execPath, ["scripts/preview.mjs"], {
  stdio: "ignore",
  env: { ...process.env, PORT: "4174" },
});
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    if ((await fetch("http://127.0.0.1:4174/")).ok) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
}

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const now = new Date().toISOString();
  const server = (id, cpu, available, total, disks) => ({
    id,
    name: id === "mx" ? "mx.bakkeit.email" : "storage.bakkeit.cloud",
    observed_at: now,
    metrics: {
      cpu_percent: cpu,
      memory_available_bytes: available * 1024 ** 3,
      memory_total_bytes: total * 1024 ** 3,
      disks: disks.map(([label, total, available]) => ({
        label,
        total_bytes: total * 1024 ** 3,
        available_bytes: available * 1024 ** 3,
      })),
      os_name: "Ubuntu",
      os_version: "22.04",
      uptime_seconds: 28 * 86400 + 6 * 3600,
    },
  });
  const fixture = {
    version: 1,
    generated_at: now,
    servers: [
      server("mx", 12.8, 4.3, 8, [["System", 150, 92]]),
      server("storage", 4.2, 5.8, 8, [
        ["System", 80, 61],
        ["Data 1", 1024, 405],
        ["Data 2", 2048, 1621],
      ]),
    ],
  };
  await page.route("**/status.json*", (route) =>
    route.fulfill({ json: fixture }),
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("http://127.0.0.1:4174/");
  await page.getByText("Ferske målinger", { exact: true }).first().waitFor();
  assert.equal(await page.locator("[role=meter]").count(), 8);
  assert.equal(
    await page
      .locator(".track-fill")
      .first()
      .evaluate((el) => el.getBoundingClientRect().width > 0),
    true,
  );
  await page.screenshot({ path: "artifacts/desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "artifacts/mobile.png", fullPage: true });
  fixture.servers[0].observed_at = new Date(
    Date.now() - 16 * 60_000,
  ).toISOString();
  fixture.servers[1].metrics = null;
  fixture.servers[1].observed_at = null;
  await page.reload();
  await page.getByText("Foreldede data", { exact: true }).waitFor();
  await page.getByText("Måling utilgjengelig", { exact: true }).waitFor();
  await page.route("**/status.json*", (route) =>
    route.fulfill({ status: 503 }),
  );
  await page.reload();
  await page
    .getByText("Kunne ikke hente nye målinger.", { exact: false })
    .waitFor();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  preview.kill();
}
console.log(
  "Browser checks passed: desktop, mobile, meters, stale, partial failure and HTTP failure.",
);
