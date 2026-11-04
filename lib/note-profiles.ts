import { identityName } from "./catalog";
const profiles: Record<string, [string, string]> = {
  lavender: ["aromatic", "A soft herbal breeze, with a clean, floral edge."],
  mint: ["green", "Cool green leaves and a bright, refreshing lift."],
  vanilla: ["sweet", "Creamy, comforting sweetness with a soft, warm glow."],
  "tonka bean": [
    "sweet",
    "Warm almond-like sweetness, with a hay-like softness.",
  ],
  benzoin: ["resin", "A balsamic resin with a warm, vanilla-like sweetness."],
  honey: ["sweet", "Golden, nectar-like sweetness with a rich floral warmth."],
  tobacco: [
    "woods",
    "A warm, dry leaf character, sometimes sweet and hay-like.",
  ],
  bergamot: [
    "citrus",
    "A sparkling citrus peel with a gently bitter, floral edge.",
  ],
  lemon: ["citrus", "Bright, zesty freshness with a crisp citrus bite."],
  orange: ["citrus", "Juicy citrus brightness with a soft, sunny sweetness."],
  grapefruit: ["citrus", "Bitter-bright citrus with a fresh, tangy sparkle."],
  mandarin: ["citrus", "Soft, juicy citrus with a sweet, cheerful brightness."],
  rose: ["floral", "Petal softness, from fresh and dewy to rich and velvety."],
  jasmine: [
    "floral",
    "Lush white petals with a radiant, enveloping character.",
  ],
  iris: ["floral", "A cool, powdery elegance with soft, earthy facets."],
  violet: ["floral", "Delicate floral sweetness with a powdery, green touch."],
  "orange blossom": [
    "floral",
    "Luminous white flowers with a delicate citrus sweetness.",
  ],
  neroli: [
    "floral",
    "Airy orange flowers, green freshness and a bitter-citrus lift.",
  ],
  tuberose: [
    "floral",
    "Creamy white florals with a lush, expressive presence.",
  ],
  geranium: ["green", "Rosy green leaves with a cool, aromatic freshness."],
  sandalwood: ["woods", "Creamy, smooth wood with a gentle, lingering warmth."],
  cedar: ["woods", "Dry, clean wood with the crispness of pencil shavings."],
  vetiver: ["woods", "Earthy roots, dry grass and a softly smoky woodiness."],
  patchouli: [
    "woods",
    "Deep earthy leaves, with woody and gently sweet facets.",
  ],
  oud: ["woods", "Dark, resinous wood, interpreted in many different ways."],
  oakmoss: [
    "green",
    "A damp forest-floor impression: earthy, green and textured.",
  ],
  musk: [
    "musk",
    "A soft, enveloping impression that can feel clean or powdery.",
  ],
  ambroxan: [
    "musk",
    "A radiant, ambery-woody aroma material with a mineral edge.",
  ],
  amber: [
    "resin",
    "A warm accord, often blending sweet, balsamic and resinous facets.",
  ],
  incense: [
    "resin",
    "Airy smoke and aromatic resins, with a meditative warmth.",
  ],
  labdanum: [
    "resin",
    "A rich, ambery resin with leathery and balsamic facets.",
  ],
  pepper: [
    "spice",
    "Dry, lively spice with an aromatic, gently prickling edge.",
  ],
  "pink pepper": [
    "spice",
    "A bright, rosy-peppery sparkle with a delicate fruitiness.",
  ],
  cinnamon: ["spice", "Warm, sweet spice with a familiar, inviting glow."],
  cardamom: [
    "spice",
    "Cool aromatic spice, with green and gently sweet facets.",
  ],
  saffron: ["spice", "Dry, warm spice with leathery and subtly earthy facets."],
  apple: [
    "fruit",
    "Crisp, juicy fruit with a fresh, lightly sweet brightness.",
  ],
  pear: ["fruit", "Soft, juicy sweetness with an airy, refreshing feel."],
  pineapple: ["fruit", "Tropical brightness: juicy, tangy and sweet."],
  coconut: ["sweet", "Creamy, milky sweetness with a soft tropical character."],
  cocoa: [
    "sweet",
    "A rich cocoa impression, from dry and bitter to softly sweet.",
  ],
  coffee: [
    "sweet",
    "Roasted warmth, with dark, aromatic and gently bitter facets.",
  ],
  leather: [
    "woods",
    "An accord evoking supple hide, from soft suede to smoky leather.",
  ],
  sage: ["aromatic", "Dry, herbal freshness with an aromatic, earthy edge."],
  "sea salt": [
    "fresh",
    "An airy mineral impression, evoking salt on a sea breeze.",
  ],
};
const aliases: Record<string, string> = {
  tonka: "tonka bean",
  cedarwood: "cedar",
  "virginia cedar": "cedar",
  "tobacco leaf": "tobacco",
  "white musk": "musk",
  "black pepper": "pepper",
  "sichuan pepper": "pepper",
  "agarwood oud": "oud",
  agarwood: "oud",
  "jasmine sambac": "jasmine",
  "madarin orange": "mandarin",
  "mandarin orange": "mandarin",
  olibanum: "incense",
  frankincense: "incense",
  "clary sage": "sage",
};
export function noteProfile(name: string) {
  const key = identityName(name);
  const canonical = aliases[key] || key;
  const profile = profiles[canonical];
  return {
    name,
    slug: canonical.replace(/\s+/g, "-"),
    exactSlug: key.replace(/\s+/g, "-"),
    tone: profile?.[0] || "neutral",
    description:
      profile?.[1] ||
      "Discover this note in the composition, and explore other fragrances that share it.",
  };
}
export function scentMood(family: string) {
  if (/sweet|amber|resin|warm|spic/i.test(family))
    return {
      tone: "amber",
      title: "Warm and sweet",
      caption: "Warm and sweet notes.",
    };
  if (/wood|dark|leather|smok/i.test(family))
    return {
      tone: "woods",
      title: "Woody and rich",
      caption: "Woody notes with depth.",
    };
  if (/flor|bloom|petal/i.test(family))
    return {
      tone: "floral",
      title: "Floral",
      caption: "Floral notes.",
    };
  return {
    tone: "fresh",
    title: "Fresh",
    caption: "Fresh notes.",
  };
}
