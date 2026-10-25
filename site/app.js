import {
  validateSnapshot,
  serverState,
  usedPercent,
  uptime,
  bytes,
} from "./model.js";
const container = document.querySelector("#servers");
const notice = document.querySelector("#notice");
let snapshot = null;
const el = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const pct = (value) =>
  new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 1 }).format(value);
const time = (value) =>
  new Intl.DateTimeFormat("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Europe/Oslo",
  }).format(new Date(value));
function metric(label, percent, detail, disk = false) {
  const box = el("div", disk ? "disk" : "metric");
  const top = el("div", "metric-topline");
  const value = el("span", "metric-value", pct(percent));
  value.append(el("small", "", "%"));
  top.append(el("span", "metric-label", label), value);
  const track = el("div", "track");
  track.setAttribute("role", "meter");
  track.setAttribute("aria-label", label);
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "100");
  track.setAttribute("aria-valuenow", percent.toFixed(1));
  const fill = el(
    "div",
    `track-fill${percent >= 90 ? " critical" : percent >= 75 ? " warning" : ""}`,
  );
  // CSSOM assignment accepts only our validated numeric percentage.
  fill.style.width = `${percent}%`;
  track.append(fill);
  box.append(top, track);
  if (detail) {
    const row = el("div", "metric-detail");
    detail.forEach((text) => row.append(el("span", "", text)));
    box.append(row);
  }
  return box;
}
function card(server) {
  const state = serverState(server);
  const m = server.metrics;
  const article = el("article", "server");
  const header = el("div", "card-header");
  const identity = el("div", "server-identity");
  identity.append(el("span", "server-icon", server.id === "mx" ? "✉" : "▤"));
  const names = el("div");
  names.append(
    el("h3", "", server.name),
    el(
      "p",
      "role",
      server.id === "mx" ? "MAIL · MAILCOW / SOGo" : "LAGRING · NEXTCLOUD",
    ),
  );
  identity.append(names);
  const badge = el("span", `badge ${state}`);
  badge.append(
    el("span", "dot"),
    document.createTextNode(
      {
        fresh: "Ferske målinger",
        stale: "Foreldede data",
        unavailable: "Utilgjengelig",
      }[state],
    ),
  );
  header.append(identity, badge);
  article.append(header);
  if (!m) {
    const empty = el("div", "empty");
    empty.append(
      el("span", "empty-icon", "◌"),
      el("strong", "", "Måling utilgjengelig"),
      el("span", "", "Nye målinger vises når innsamlingen lykkes."),
    );
    article.append(empty);
  } else {
    const body = el("div", "card-body");
    body.append(
      metric("CPU-bruk", m.cpu_percent, ["Målt over 1 sekund", "Alle kjerner"]),
    );
    body.append(
      metric(
        "Minnebruk",
        usedPercent(m.memory_total_bytes, m.memory_available_bytes),
        [
          bytes(m.memory_total_bytes - m.memory_available_bytes) + " brukt",
          bytes(m.memory_total_bytes) + " totalt",
        ],
      ),
    );
    const disks = el("section", "disk-section");
    disks.append(el("h4", "disk-title", "Diskplass"));
    for (const d of m.disks)
      disks.append(
        metric(
          d.label,
          usedPercent(d.total_bytes, d.available_bytes),
          [
            bytes(d.total_bytes - d.available_bytes) + " brukt / reservert",
            bytes(d.available_bytes) + " tilgjengelig",
          ],
          true,
        ),
      );
    body.append(disks);
    const metadata = el("dl", "metadata");
    for (const [key, value] of [
      ["Operativsystem", `${m.os_name} ${m.os_version}`],
      ["Oppetid", uptime(m.uptime_seconds)],
    ]) {
      const item = el("div");
      item.append(el("dt", "", key), el("dd", "", value));
      metadata.append(item);
    }
    body.append(metadata);
    article.append(body);
  }
  const bottom = el("div", "card-bottom");
  const label = el("span", "private-label");
  label.append(el("span", "dot"), document.createTextNode("Privat innsamling"));
  bottom.append(
    label,
    el(
      "span",
      "",
      server.observed_at
        ? `Målt ${time(server.observed_at)} norsk tid`
        : "Ingen aktuell måling",
    ),
  );
  article.append(bottom);
  return article;
}
function render() {
  if (!snapshot) return;
  container.replaceChildren(...snapshot.servers.map(card));
  document.querySelector("#last-update").textContent = snapshot.generated_at
    ? `Siste innsamling ${time(snapshot.generated_at)} norsk tid`
    : "Ingen publiserte målinger ennå";
}
async function refresh() {
  try {
    const response = await fetch("./status.json", { cache: "no-store" });
    if (!response.ok) throw Error("Snapshot unavailable");
    snapshot = validateSnapshot(await response.json());
    notice.hidden = true;
    if (snapshot.generated_at === null) {
      notice.textContent =
        "Dashboardet er klart. Faktiske målinger er ikke publisert ennå.";
      notice.hidden = false;
    }
  } catch {
    notice.textContent =
      "Kunne ikke hente nye målinger. Eventuelle tidligere tall beholder sitt opprinnelige tidspunkt.";
    notice.hidden = false;
    if (!snapshot)
      snapshot = {
        generated_at: null,
        servers: [
          {
            id: "mx",
            name: "mx.bakkeit.email",
            observed_at: null,
            metrics: null,
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
  render();
}
await refresh();
setInterval(refresh, 60_000);
setInterval(render, 30_000);
