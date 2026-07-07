// Strip statistik dengan pembatas hairline (gap-px di atas bg garis).
// Kolom menyesuaikan jumlah stat lewat auto-fit, jadi 3 atau 4 item sama rapinya.
export default function StatStrip({ stats }: { stats: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-ink-line bg-ink-line sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
      {stats.map(([label, value]) => (
        <div key={label} className="bg-ink-soft px-4 py-3">
          <dt className="text-xs text-mute">{label}</dt>
          <dd className="mt-1 font-serif text-lg font-semibold tabular-nums sm:text-xl">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
