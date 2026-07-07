import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import NavLinks from "@/components/NavLinks";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "IPO Saham Indonesia",
    template: "%s | IPO Saham Indonesia",
  },
  description:
    "Jadwal, harga, dan statistik IPO saham di Bursa Efek Indonesia, dilengkapi kalkulator ARA/ARB dan estimasi penjatahan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="sticky top-3 z-10 mx-auto w-full max-w-5xl px-4">
          <nav className="flex items-center justify-between gap-2 rounded-full border border-ink-line bg-ink-soft/90 px-3 py-3 text-sm shadow-sm shadow-black/5 backdrop-blur-sm sm:gap-4 sm:px-4 sm:py-4">
            <Link href="/" className="font-serif text-lg font-semibold">
              IPO Saham
            </Link>
            <NavLinks />
          </nav>
        </header>
        {children}
        <footer className="mt-12 border-t border-ink-line bg-ink-soft/60">
          <div className="mx-auto w-full max-w-5xl space-y-3 px-4 py-8 sm:px-6">
            <p className="font-serif text-base font-semibold">IPO Saham Indonesia</p>
            <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-mute">
              <Link href="/" className="hover:text-fog">Beranda</Link>
              <Link href="/kalkulator" className="hover:text-fog">Kalkulator ARA/ARB</Link>
              <Link href="/underwriter" className="hover:text-fog">Underwriter</Link>
            </nav>
            <p className="max-w-2xl text-xs leading-relaxed text-mute">
              Bukan ajakan membeli. Data dari e-ipo.co.id, diperbarui otomatis; estimasi
              penjatahan bukan hasil resmi.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
