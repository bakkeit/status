import { readFile } from "node:fs/promises";
import { validateSnapshot } from "../site/model.js";
const file = process.argv[2];
if (!file) throw Error("Usage: node scripts/validate.mjs <snapshot.json>");
const value = await readFile(file, "utf8");
if (Buffer.byteLength(value) > 32_768) throw Error("Snapshot too large");
validateSnapshot(JSON.parse(value));
console.log("Public snapshot contract passed.");
