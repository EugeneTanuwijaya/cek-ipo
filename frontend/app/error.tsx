'use client'; // Error boundaries must be Client Components

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Terjadi kesalahan</h1>
      <p className="text-sm text-gray-600">
        Data sedang tidak dapat dimuat, coba lagi nanti.
      </p>
      <button
        onClick={() => reset()}
        className="rounded border px-4 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Coba lagi
      </button>
    </main>
  );
}
