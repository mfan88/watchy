// NHL team logos live in /public/teams/<CODE>.svg (dark-background variants).
const CODES = new Set([
  "ANA", "BOS", "BUF", "CAR", "CBJ", "CGY", "CHI", "COL", "DAL", "DET", "EDM", "FLA", "LAK", "MIN", "MTL", "NJD",
  "NSH", "NYI", "NYR", "OTT", "PHI", "PIT", "SEA", "SJS", "STL", "TBL", "TOR", "UTA", "VAN", "VGK", "WPG", "WSH",
]);

export function teamLogo(code?: string): string | undefined {
  return code && CODES.has(code) ? `/teams/${code}.svg` : undefined;
}
