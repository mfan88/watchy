import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { matchupImage } from "../src/lib/matchup.ts";
import teams from "../src/lib/teams.json" with { type: "json" };

const file = (url: string) => new URL(`../public${url}`, import.meta.url);

test("any returned image path points at a real file", () => {
  let found = 0;
  for (const a of teams) for (const h of teams) {
    const url = matchupImage({ away: a, home: h });
    if (!url) continue;
    found++;
    assert.ok(existsSync(file(url)), url);
  }
  assert.ok(found >= 900, `expected nearly every pairing, got ${found}`);
});

test("orientation is away_vs_home", () => {
  assert.equal(matchupImage({ away: "CAR", home: "EDM" }), "/matchups/CAR_vs_EDM.webp");
  assert.equal(matchupImage({ away: "EDM", home: "CAR" }), "/matchups/EDM_vs_CAR.webp");
  assert.equal(matchupImage({ away: "MTL", home: "CHI" }), "/matchups/MTL_vs_CHI.webp");
});

test("unknown teams and same-team pairs have no image", () => {
  assert.equal(matchupImage({ away: "ABC", home: "XYZ" }), undefined);
  assert.equal(matchupImage({ away: "EDM", home: "EDM" }), undefined);
  assert.equal(matchupImage({ away: undefined, home: "EDM" }), undefined);
});
