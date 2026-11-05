import { useId } from "react";

const bottleColors = [
  ["#c5905d", "#70452d"],
  ["#a96858", "#613b35"],
  ["#9caa91", "#4d6554"],
  ["#bdad7f", "#766440"],
  ["#8797a0", "#465d6a"],
];

function colorIndex(value: string) {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % bottleColors.length;
}

function nameLines(name: string) {
  const lines: string[] = [];
  let current = "";
  for (const word of name.split(/\s+/)) {
    if (!current) current = word;
    else if ((current + " " + word).length <= 16) current += " " + word;
    else if (lines.length === 0) {
      lines.push(current);
      current = word;
    } else {
      current = current.slice(0, 13) + "...";
      break;
    }
  }
  if (current) lines.push(current.length > 16 ? current.slice(0, 13) + "..." : current);
  return lines;
}

export function BottleIllustration({
  name,
  brand,
}: {
  name: string;
  brand: string;
}) {
  const [light, dark] = bottleColors[colorIndex(brand + name)];
  const gradientId = "bottle-glass-" + useId().replaceAll(":", "");
  const lines = nameLines(name);
  return (
    <div
      className="photo-illustration"
      role="img"
      aria-label={`${brand} ${name} bottle illustration`}
    >
      <svg viewBox="0 0 240 300" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor={dark} />
            <stop offset="0.18" stopColor={light} />
            <stop offset="0.5" stopColor={dark} />
            <stop offset="0.82" stopColor={light} />
            <stop offset="1" stopColor={dark} />
          </linearGradient>
        </defs>
        <ellipse cx="120" cy="270" rx="67" ry="10" fill="#20251e" opacity=".12" />
        <rect x="98" y="28" width="44" height="42" rx="6" fill="#333832" />
        <path d="M101 66h38v27h-38z" fill="#8e8b7c" />
        <path
          d="M89 88h62v15c0 12 31 17 36 39l8 93c2 19-12 34-31 34H76c-19 0-33-15-31-34l8-93c2-22 36-27 36-39z"
          fill={`url(#${gradientId})`}
          stroke="#ffffff"
          strokeOpacity=".68"
          strokeWidth="4"
        />
        <path d="M62 159c14-11 31-14 58-14v124H75c-19 0-33-15-31-34z" fill="#fff" opacity=".13" />
        <rect x="69" y="166" width="102" height="62" rx="3" fill="#f4f0e6" opacity=".94" />
        <text x="120" y="181" textAnchor="middle" fontSize="6" letterSpacing="1.3" fill="#586052">
          {brand.toUpperCase().slice(0, 18)}
        </text>
        {lines.map((line, index) => (
          <text
            key={index}
            x="120"
            y={199 + index * 13}
            textAnchor="middle"
            fontSize={line.length > 13 ? 7 : 9}
            fontFamily="Georgia, serif"
            fill="#263128"
          >
            {line}
          </text>
        ))}
        <text x="120" y="220" textAnchor="middle" fontSize="5" letterSpacing="1" fill="#747b70">
          EAU DE PARFUM
        </text>
      </svg>
      <span>Bottle illustration</span>
    </div>
  );
}

