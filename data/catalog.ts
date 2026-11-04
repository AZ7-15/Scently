import type { Fragrance, Note, Season } from "../lib/domain";
import photos from "./photo-sources.json";
const notes = (stage: Note["stage"], names: string[]): Note[] =>
  names.map((name) => ({ name, stage }));
const checkedAt = "2026-10-30T13:00:00.000Z";
const base = {
  year: null,
  perfumer: null,
  checkedAt,
  demo: false,
  rating: null,
  reviewCount: 0,
  longevity: null,
  projection: null,
  performanceVotes: 0,
  seasonVotes: {},
  offers: [],
  occasions: [],
  style: "all",
};
const records: Omit<Fragrance, "imageUrl">[] = [
  {
    ...base,
    id: "sauvage-edp",
    slug: "dior-sauvage-eau-de-parfum",
    name: "Sauvage",
    brand: "Dior",
    concentration: "Eau de Parfum",
    style: "masculine",
    family: "fresh",
    color: "#283f53",
    shape: "round",
    description:
      "Bright bergamot meets aromatic spice, with vanilla and ambroxan in the dry-down.",
    accords: ["Citrus", "Aromatic", "Vanilla"],
    notes: [
      ...notes("top", ["Bergamot"]),
      ...notes("heart", ["Sichuan pepper", "Lavender", "Star anise"]),
      ...notes("base", ["Vanilla", "Ambroxan"]),
    ],
    editorialSeasons: ["spring", "fall"],
    sourceName: "Dior · official product information",
    sourceUrl:
      "https://www.dior.com/en_us/beauty/products/sauvage-eau-de-parfum-C099700027.html",
  },
  {
    ...base,
    id: "santal-33",
    slug: "le-labo-santal-33",
    name: "Santal 33",
    brand: "Le Labo",
    concentration: "Eau de Parfum",
    family: "woody",
    color: "#b7a47d",
    shape: "round",
    description:
      "Sandalwood and cedar sit alongside cardamom, iris, violet, and leathery notes.",
    accords: ["Woody", "Leather", "Spicy"],
    notes: notes("unclassified", [
      "Sandalwood",
      "Cedar",
      "Cardamom",
      "Iris",
      "Violet",
      "Leather",
      "Musk",
    ]),
    editorialSeasons: ["fall", "spring"],
    sourceName: "Le Labo · Our Creations",
    sourceUrl: "https://www.lelabofragrances.com/our-creations.html",
  },
  {
    ...base,
    id: "tobacco-vanille",
    slug: "tom-ford-tobacco-vanille",
    name: "Tobacco Vanille",
    brand: "Tom Ford",
    concentration: "Eau de Parfum",
    family: "warm",
    color: "#5f3528",
    shape: "square",
    description:
      "Tobacco and vanilla form a warm composition with cocoa, tonka bean, and dried-fruit facets.",
    accords: ["Vanilla", "Tobacco", "Warm spicy"],
    notes: notes("unclassified", [
      "Tobacco",
      "Vanilla",
      "Tonka bean",
      "Cocoa",
      "Ginger",
      "Dried fruit",
    ]),
    editorialSeasons: ["winter", "fall"],
    sourceName: "Tom Ford Beauty · official product information",
    sourceUrl:
      "https://www.tomfordbeauty.com/products/tobacco-vanille-eau-de-parfum",
  },
  {
    ...base,
    id: "wood-sage-sea-salt",
    slug: "jo-malone-wood-sage-sea-salt",
    name: "Wood Sage & Sea Salt",
    brand: "Jo Malone London",
    concentration: "Cologne",
    family: "fresh",
    color: "#c1c3ab",
    shape: "tall",
    description:
      "Ambrette seeds, sea salt, and sage create a fresh, aromatic interpretation of the coast.",
    accords: ["Fresh", "Woody", "Aromatic"],
    notes: [
      ...notes("top", ["Ambrette seeds"]),
      ...notes("heart", ["Sea salt"]),
      ...notes("base", ["Sage"]),
    ],
    editorialSeasons: ["spring", "summer"],
    sourceName: "Jo Malone London · scent notes",
    sourceUrl: "https://www.jomalone.com/wood-sage-sea-salt",
  },
  {
    ...base,
    id: "jazz-club",
    slug: "maison-margiela-jazz-club",
    name: "Jazz Club",
    brand: "Maison Margiela",
    concentration: "Eau de Toilette",
    style: "masculine",
    family: "dark",
    color: "#bb874b",
    shape: "round",
    description:
      "A warm blend of rum, tobacco, and vanilla, lifted by pink pepper and citrus.",
    accords: ["Tobacco", "Vanilla", "Woody"],
    notes: [
      ...notes("top", ["Pink pepper", "Neroli", "Lemon"]),
      ...notes("heart", ["Rum", "Clary sage", "Vetiver"]),
      ...notes("base", ["Styrax", "Tobacco", "Vanilla"]),
    ],
    editorialSeasons: ["fall", "winter"],
    sourceName: "Maison Margiela Fragrances · official note pyramid",
    sourceUrl:
      "https://www.maisonmargiela-fragrances.eu/en_GB/fragrances/discover/replica-memories/replica-jazz-club/MM008.html",
  },
  {
    ...base,
    id: "another-13",
    slug: "le-labo-another-13",
    name: "Another 13",
    brand: "Le Labo",
    concentration: "Eau de Parfum",
    family: "fresh",
    color: "#d6cba6",
    shape: "square",
    description:
      "A musk-centered composition built around ambroxyde, with jasmine and moss.",
    accords: ["Musky", "Floral", "Mossy"],
    notes: notes("unclassified", ["Ambroxyde", "Jasmine", "Moss"]),
    editorialSeasons: ["spring", "summer"] as Season[],
    sourceName: "Le Labo · Our Creations",
    sourceUrl: "https://www.lelabofragrances.com/our-creations.html",
  },
];
export const curatedCatalog: Fragrance[] = records.map((record) => {
  const photo = photos.find((candidate) => candidate.id === record.id)!;
  return {
    ...record,
    imageUrl: "/images/products/" + photo.file,
  };
});
