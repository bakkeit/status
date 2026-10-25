import { writeFile } from "node:fs/promises";
import { prepareSnapshot } from "./snapshot.mjs";
const data = await prepareSnapshot(process.env.SNAPSHOT);
await writeFile(
  new URL("../site/status.json", import.meta.url),
  JSON.stringify(data),
);
