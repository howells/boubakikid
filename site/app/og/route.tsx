import { ImageResponse } from "next/og";

export const runtime = "edge";

const SPIKY_POOL = "KVWXZkvwxzAMNYTLFEHIJPR<>^*/\\|!#%&+741";
const LABEL = "boubakikid";

const WIDTH = 1200;
const HEIGHT = 630;
const CHAR_SIZE = 22;
const SPACING = 32;

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export async function GET() {
  // Load Geist Mono font
  const fontData = await fetch(
    "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400&display=swap",
  ).then((res) => res.text());

  const fontUrl = fontData.match(
    /src:\s*url\(([^)]+)\)\s*format\('woff2'\)/,
  )?.[1];

  const font = fontUrl
    ? await fetch(fontUrl).then((res) => res.arrayBuffer())
    : null;

  const cols = Math.floor(WIDTH / SPACING);
  const rows = Math.floor(HEIGHT / SPACING);
  const offsetX = (WIDTH - (cols - 1) * SPACING) / 2;
  const offsetY = (HEIGHT - (rows - 1) * SPACING) / 2;

  const centerRow = Math.floor(rows / 2);
  const centerCol = Math.floor(cols / 2);
  const labelStartCol = centerCol - Math.floor(LABEL.length / 2);

  const chars: { char: string; x: number; y: number; isLabel: boolean }[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = offsetX + col * SPACING;
      const y = offsetY + row * SPACING;

      const isLabelCell =
        row === centerRow &&
        col >= labelStartCol &&
        col < labelStartCol + LABEL.length;

      if (isLabelCell) {
        chars.push({
          char: LABEL[col - labelStartCol],
          x,
          y,
          isLabel: true,
        });
      } else {
        const seed = row * cols + col + 42;
        const charIndex = Math.floor(seededRandom(seed) * SPIKY_POOL.length);
        chars.push({
          char: SPIKY_POOL[charIndex],
          x,
          y,
          isLabel: false,
        });
      }
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        background: "#fafafa",
        display: "flex",
        position: "relative",
        fontFamily: '"Geist Mono", monospace',
      }}
    >
      {chars.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: c.x,
            top: c.y,
            fontSize: CHAR_SIZE,
            color: c.isLabel ? "#0a0a0a" : "#c8c8c8",
            transform: "translate(-50%, -50%)",
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          {c.char}
        </div>
      ))}
    </div>,
    {
      width: WIDTH,
      height: HEIGHT,
      ...(font
        ? {
            fonts: [
              {
                name: "Geist Mono",
                data: font,
                style: "normal" as const,
                weight: 400 as const,
              },
            ],
          }
        : {}),
    },
  );
}
