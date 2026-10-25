import { validateSnapshot } from "../site/model.js";

// A source-only deploy must retain real measurements and their original age.
export async function prepareSnapshot(
  supplied,
  { fetchSnapshot = fetch, now = Date.now() } = {},
) {
  const hasInput = Boolean(supplied?.trim());
  let raw = supplied;
  if (!hasInput) {
    const response = await fetchSnapshot(
      "https://status.bakkeit.cloud/status.json?rebuild=" + now,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!response.ok)
      throw Error(
        "Could not retrieve the previous snapshot; refusing to clear measurements",
      );
    raw = await response.text();
  }
  if (Buffer.byteLength(raw) > 32768) throw Error("Snapshot too large");
  const data = validateSnapshot(JSON.parse(raw));
  const age = now - Date.parse(data.generated_at);
  if (!Number.isFinite(age) || age < -60000)
    throw Error("Expected a real snapshot with a valid timestamp");
  if (hasInput && age > 900000) throw Error("New snapshot must be recent");
  // An old preserved snapshot stays old; the UI will display its stale state.
  return data;
}
