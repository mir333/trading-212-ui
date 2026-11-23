// T212 tickers encode the listing venue: a lowercase marker before `_EQ`
// (`RRl_EQ` = London, optionally followed by a digit: `V6Cd1_EQ`) or a
// country segment (`PMET_CA_EQ`). Yahoo uses a dotted suffix instead.

const MARKER_SUFFIX: Record<string, string> = {
  l: '.L', // London Stock Exchange
  d: '.DE', // Xetra
  p: '.PA', // Euronext Paris
  a: '.AS', // Euronext Amsterdam
  e: '.MC', // Madrid
  m: '.MI', // Borsa Italiana
  s: '.SW', // SIX Swiss
};

const COUNTRY_SUFFIX: Record<string, string> = {
  US: '',
  CA: '.TO', // Toronto
  BE: '.BR', // Euronext Brussels
  AT: '.VI', // Vienna
  PT: '.LS', // Euronext Lisbon
};

/**
 * Yahoo symbol for a T212 ticker. `shortName` is the instrument's exchange
 * symbol from T212's instrument list (it follows renames, e.g. ALCC1 → OKLO);
 * without it the base comes from the ticker itself. Unknown venues fall back
 * to the ticker with its `_…_EQ` tail stripped.
 */
export function yahooSymbolFor(t212Ticker: string, shortName?: string): string {
  const country = t212Ticker.match(/^(.+?)_([A-Z]{2})_EQ$/);
  if (country && country[2] in COUNTRY_SUFFIX) {
    const base = (shortName || country[1]).replace(/\./g, '-');
    return base + COUNTRY_SUFFIX[country[2]];
  }
  const marker = t212Ticker.match(/^(.+?)([a-z])\d?_EQ$/);
  if (marker && marker[2] in MARKER_SUFFIX) {
    return (shortName || marker[1]) + MARKER_SUFFIX[marker[2]];
  }
  return t212Ticker.replace(/_[A-Z_]+$/, '');
}
