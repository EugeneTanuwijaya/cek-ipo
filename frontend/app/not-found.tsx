import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-ink-line bg-ink-soft p-8 text-center">
        <p className="font-serif text-5xl font-semibold text-ink-line">404</p>
        <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
        <p className="text-sm text-mute">
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/"
          className="inline-block rounded-full bg-ember px-4 py-2 text-sm font-medium text-white hover:bg-ember-soft"
        >
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
