// Maps a stream provider name (the part after " · " in the playlist) to a
// logo in /public/providers. Order matters: the first matching rule wins.
// Providers with no rule keep their initials.
const RULES: [RegExp, string][] = [
  [/^espn\s*\+/i, "espn-plus"],
  [/^espn/i, "espn"],
  // SN, SN+, SN1, SNOne, SN360, SN West/East/Ontario/Pacific, Sportsnet ...
  [/^(sportsnet|sn)(?=$|[\s+\d]|one|west|east|ontario|pacific)/i, "sportsnet-all"],
  [/^tsn/i, "tsn"],
  [/^rds/i, "rds"],
  [/^tva/i, "tva-sports"],
  [/^bein/i, "bein-sports"],
  [/^viaplay/i, "viaplay"],
  [/^v\s*sport/i, "v-sport"],
  [/^nova\s*sport/i, "nova-sport"],
  [/^chsn/i, "chsn"],
  [/^nhl\s*(n$|n\b|network)/i, "nhl-network"],
  [/^max\s*sport/i, "max-sport"],
  [/^premier\s*sports?/i, "premier-sports"],
  [/^sport\s*tv/i, "sport-tv"],
  [/^(sport\s*5|5\s*stars?|sport\s*five)/i, "sport-five-stars"],
];

export function providerLogo(provider: string): string | undefined {
  const name = provider.trim();
  for (const [re, key] of RULES) if (re.test(name)) return `/providers/${key}.webp`;
  return undefined;
}
