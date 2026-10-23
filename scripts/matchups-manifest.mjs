// Lists public/matchups/*.webp into src/lib/matchups.json so the UI only
// requests images that exist. Runs automatically before dev and build.
import { readdirSync, writeFileSync, existsSync } from "node:fs";
const dir = new URL("../public/matchups/", import.meta.url);
const keys = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)).sort() : [];
writeFileSync(new URL("../src/lib/matchups.json", import.meta.url), JSON.stringify(keys) + "\n");
console.log(`matchups manifest: ${keys.length} images`);
