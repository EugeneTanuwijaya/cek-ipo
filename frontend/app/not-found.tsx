import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-gray-600">
        Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
      </p>
      <Link href="/" className="text-blue-600 hover:underline">
        Kembali ke beranda
      </Link>
    </main>
  );
}
