import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseM3U } from "../src/lib/m3u.ts";
import { parseXmltv, parseXmltvTime } from "../src/lib/xmltv.ts";

const m3u = readFileSync(new URL("./fixtures/playlist.m3u", import.meta.url), "utf8");
const xml = readFileSync(new URL("./fixtures/guide.xml", import.meta.url), "utf8");

test("m3u: parses all channels with real attributes", () => {
  const ch = parseM3U(m3u);
  assert.equal(ch.length, 9);
  assert.deepEqual(ch[0], {
    id: "htv-8f10348a47", slug: "ch_8f10348a47", no: 1, name: "CAR @ EDM · SN+",
    game: "CAR @ EDM", provider: "SN+", away: "CAR", home: "EDM", logo: undefined,
  });
  assert.equal(ch[7].provider, "Main feed"); // no " · " suffix
  assert.equal(ch[4].provider, "ESPN+ (away feed)");
});

test("m3u: stream url (secret) is not kept on the parsed channel", () => {
  assert.ok(!JSON.stringify(parseM3U(m3u)).includes("TESTSECRET"));
});

test("xmltv: time parsing", () => {
  assert.equal(parseXmltvTime("20261022130000 +0000"), Date.UTC(2026, 9, 22, 13));
  assert.equal(parseXmltvTime("20261022130000 -0400"), Date.UTC(2026, 9, 22, 17));
});

test("xmltv: programmes, multi-line titles, starting-soon flag", () => {
  const p = parseXmltv(xml);
  assert.equal(p.length, 18);
  const soon = p.filter((x) => x.soon);
  assert.equal(soon.length, 9);
  assert.equal(soon[3].t, "Hurricanes at Oilers · Viaplay 3 Urheilu"); // newline-wrapped title
  const real = p.find((x) => x.c === "htv-8f10348a47" && !x.soon)!;
  assert.equal(real.d, "NHL: Carolina - Edmonton Oilers");
});
