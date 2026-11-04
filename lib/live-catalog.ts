export type LiveFragrance = {
  name: string;
  brand: string;
  family: string;
  lookup: string;
  sourceUrl: string;
};
export type LiveSearch = {
  query: string;
  total: number;
  matches: LiveFragrance[];
  continuation: string | null;
  source: string;
};
export type LiveProfile = {
  name: string;
  brand: string;
  year: number | null;
  perfumer: string | null;
  concentration: string | null;
  family: string;
  subfamily: string | null;
  description: string;
  pyramid: { top: string[]; heart: string[]; base: string[] };
  notes: string[];
  seasons: string[];
  sourceUrl: string;
  checkedAt: string;
  source: string;
  supplementarySource?: {
    name: string;
    url: string;
    checkedAt: string;
  };
};
export function liveProfilePath(fragrance: Pick<LiveFragrance, "lookup">) {
  return "/discover/" + encodeURIComponent(fragrance.lookup);
}
// Suggestions are starting points, not a claim that any source has a whole brand.
export const brandSuggestions = {
  "Budget & everyday": [
    "Zara",
    "Nautica",
    "Davidoff",
    "Elizabeth Arden",
    "Calvin Klein",
    "Guess",
  ],
  Designer: [
    "Dior",
    "Chanel",
    "Yves Saint Laurent",
    "Versace",
    "Prada",
    "Giorgio Armani",
    "Jean Paul Gaultier",
  ],
  Niche: [
    "Creed",
    "Parfums de Marly",
    "Xerjoff",
    "Amouage",
    "Nishane",
    "Maison Francis Kurkdjian",
    "Byredo",
    "Le Labo",
  ],
  Arabian: [
    "Lattafa",
    "Armaf",
    "Afnan",
    "Al Haramain",
    "Rasasi",
    "Swiss Arabian",
    "Ajmal",
    "Al Rehab",
    "Maison Alhambra",
    "Paris Corner",
  ],
};
