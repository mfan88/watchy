import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { teamLogo } from "../src/lib/teams.ts";

const files = readdirSync(new URL("../public/teams/", import.meta.url)).filter((f) => f.endsWith(".svg")).map((f) => f.slice(0, -4));

test("every known team code has a logo file, and every file is a known code", () => {
  assert.equal(files.length, 32);
  for (const code of files) assert.equal(teamLogo(code), `/teams/${code}.svg`, code);
});

test("unknown or missing codes fall back to initials", () => {
  for (const c of [undefined, "", "XYZ", "edm"]) assert.equal(teamLogo(c), undefined, String(c));
});
