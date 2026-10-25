// Public contract. Reject extra fields instead of accidentally publishing raw facts.
const names = { mx: "mx.bakkeit.email", storage: "storage.bakkeit.cloud" };
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).sort().join(",") === [...keys].sort().join(",");
const number = (value) => Number.isFinite(value) && value >= 0;
const timestamp = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) &&
  Number.isFinite(Date.parse(value));
const text = (value) =>
  typeof value === "string" && /^[a-zA-Z0-9 .()+_-]{1,64}$/.test(value);

export function validateSnapshot(data) {
  if (
    !exact(data, ["version", "generated_at", "servers"]) ||
    data.version !== 1 ||
    !(data.generated_at === null || timestamp(data.generated_at)) ||
    !Array.isArray(data.servers) ||
    data.servers.length !== 2
  )
    throw Error("Invalid snapshot");
  const seen = new Set();
  for (const server of data.servers) {
    if (
      !exact(server, ["id", "name", "observed_at", "metrics"]) ||
      seen.has(server.id) ||
      !Object.hasOwn(names, server.id) ||
      names[server.id] !== server.name ||
      !(server.observed_at === null || timestamp(server.observed_at))
    )
      throw Error("Invalid server");
    seen.add(server.id);
    const m = server.metrics;
    if (m === null) {
      if (server.observed_at !== null)
        throw Error("Unavailable server has a timestamp");
      continue;
    }
    if (
      data.generated_at === null ||
      server.observed_at === null ||
      Date.parse(server.observed_at) > Date.parse(data.generated_at) + 5000 ||
      !exact(m, [
        "cpu_percent",
        "memory_total_bytes",
        "memory_available_bytes",
        "disks",
        "os_name",
        "os_version",
        "uptime_seconds",
      ]) ||
      !number(m.cpu_percent) ||
      m.cpu_percent > 100 ||
      !number(m.memory_total_bytes) ||
      m.memory_total_bytes === 0 ||
      !number(m.memory_available_bytes) ||
      m.memory_available_bytes > m.memory_total_bytes ||
      !number(m.uptime_seconds) ||
      !text(m.os_name) ||
      !text(m.os_version) ||
      !Array.isArray(m.disks) ||
      m.disks.length < 1 ||
      m.disks.length > 16
    )
      throw Error("Invalid metrics");
    const labels = new Set();
    for (const disk of m.disks) {
      if (
        !exact(disk, ["label", "total_bytes", "available_bytes"]) ||
        !/^(System|Data(?: [1-9][0-9]?)?)$/.test(disk.label) ||
        labels.has(disk.label) ||
        !number(disk.total_bytes) ||
        disk.total_bytes === 0 ||
        !number(disk.available_bytes) ||
        disk.available_bytes > disk.total_bytes
      )
        throw Error("Invalid disk");
      labels.add(disk.label);
    }
  }
  return data;
}

export function serverState(server, now = Date.now()) {
  if (server.metrics === null) return "unavailable";
  if (
    now - Date.parse(server.observed_at) > 15 * 60 * 1000 ||
    Date.parse(server.observed_at) > now + 60_000
  )
    return "stale";
  return "fresh";
}
export const usedPercent = (total, available) =>
  ((total - available) / total) * 100;
export function uptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days
    ? `${days} d ${hours} t`
    : `${hours} t ${Math.floor((seconds % 3600) / 60)} min`;
}
export function bytes(value) {
  return (
    new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 }).format(
      value / 1024 ** 3,
    ) + " GiB"
  );
}
