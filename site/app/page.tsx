import Link from "next/link";

const demos = [
  {
    href: "/heartbeat",
    title: "Heartbeat",
    description: "Character widths as EKG waveforms",
    color: "text-green-400",
  },
  {
    href: "/anatomy",
    title: "Anatomy",
    description: "Glyph shapes sized by pixel width",
    color: "text-violet-400",
  },
  {
    href: "/bubbles",
    title: "Bubbles",
    description: "Physics circles from character widths",
    color: "text-blue-400",
  },
  {
    href: "/river",
    title: "River",
    description: "Calm vs turbulent ID streams",
    color: "text-cyan-400",
  },
  {
    href: "/heatmap",
    title: "Heatmap",
    description: "Character weight treemap",
    color: "text-amber-400",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold tracking-tight mb-2">boubakikid</h1>
      <p className="text-[var(--muted)] text-lg mb-12 text-center max-w-lg">
        Pleasant ID generator based on the bouba/kiki effect, visualized with
        pretext.js typography measurement.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl w-full">
        {demos.map((demo) => (
          <Link
            key={demo.href}
            href={demo.href}
            className="group border border-neutral-800 rounded-lg p-6 hover:border-neutral-600 transition-colors"
          >
            <h2 className={`text-xl font-semibold mb-1 ${demo.color}`}>
              {demo.title}
            </h2>
            <p className="text-sm text-[var(--muted)] group-hover:text-neutral-400 transition-colors">
              {demo.description}
            </p>
          </Link>
        ))}
      </div>

      <p className="mt-12 text-sm text-[var(--muted)]">
        <code className="bg-neutral-900 px-2 py-1 rounded text-neutral-300">
          npm install boubakikid
        </code>
      </p>
    </main>
  );
}
