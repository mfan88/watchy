import { test } from "node:test";
import assert from "node:assert/strict";
import { providerLogo } from "../src/lib/providers.ts";

const key = (n: string) => providerLogo(n)?.replace("/providers/", "").replace(".webp", "");

test("Sportsnet variants share one logo", () => {
  for (const n of ["SN", "SN1", "SNOne", "SN West", "SN Ontario", "SN+", "SN East", "SN360", "SN Pacific", "Sportsnet"])
    assert.equal(key(n), "sportsnet-all", n);
});

test("ESPN and ESPN+ are different logos", () => {
  assert.equal(key("ESPN"), "espn");
  assert.equal(key("ESPN2"), "espn");
  assert.equal(key("ESPN+"), "espn-plus");
  assert.equal(key("ESPN+ (away feed)"), "espn-plus");
});

test("suffixes and numbers fold into the base network", () => {
  assert.equal(key("TVA Sports (french)"), "tva-sports");
  assert.equal(key("beIN Sports Max 5 (french)"), "bein-sports");
  assert.equal(key("Nova Sport 2 (czech)"), "nova-sport");
  assert.equal(key("Viaplay 3 Urheilu"), "viaplay");
  assert.equal(key("TSN2"), "tsn");
  assert.equal(key("NHLN"), "nhl-network");
  assert.equal(key("NHL Network"), "nhl-network");
});

test("main feed gets the watchy logo", () => {
  assert.equal(providerLogo("Main feed"), "/providers/watchy.svg");
  assert.equal(providerLogo("main feed"), "/providers/watchy.svg");
});

test("unknown providers fall back to initials", () => {
  for (const n of ["Some Random Channel", "Snooker HD", "Main feed 2", ""]) assert.equal(providerLogo(n), undefined, n);
});
