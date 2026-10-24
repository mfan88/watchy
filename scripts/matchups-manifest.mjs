// Every AWAY_vs_HOME pairing of the 32 NHL teams should have an image in
// public/matchups. This lists the ones that don't, so the UI can fall back to
// the team-logo poster without requesting a file that doesn't exist.
// Runs automatically before dev and build.
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
const teams = JSON.parse(readFileSync(new URL("../src/lib/teams.json", import.meta.url), "utf8"));
const dir = new URL("../public/matchups/", import.meta.url);
const have = new Set(existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5)) : []);
const missing = [];
for (const a of teams) for (const h of teams) if (a !== h && !have.has(`${a}_vs_${h}`)) missing.push(`${a}_vs_${h}`);
writeFileSync(new URL("../src/lib/matchups-missing.json", import.meta.url), JSON.stringify(missing.sort()) + "\n");
console.log(`matchups: ${have.size} images, ${missing.length} missing${missing.length && missing.length <= 12 ? " (" + missing.join(", ") + ")" : ""}`);
