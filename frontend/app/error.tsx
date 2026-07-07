'use client'; // Error boundaries must be Client Components

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-ink-line bg-ink-soft p-8 text-center">
        <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
        <p className="text-sm text-mute">
          Data sedang tidak dapat dimuat, coba lagi nanti.
        </p>
        <button
          onClick={() => reset()}
          className="rounded-full bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember-soft"
        >
          Coba lagi
        </button>
      </div>
    </main>
  );
}
