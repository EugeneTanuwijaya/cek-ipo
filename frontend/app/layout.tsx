import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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

const NAV_LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/kalkulator", label: "Kalkulator" },
  { href: "/underwriter", label: "Underwriter" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <nav className="mx-auto flex w-full max-w-5xl items-center gap-6 p-4 text-sm font-medium">
            {NAV_LINKS.map(link => (
              <Link key={link.href} href={link.href} className="hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
        <footer className="border-t">
          <p className="mx-auto w-full max-w-5xl p-4 text-xs text-gray-500">
            Bukan ajakan membeli. Data dari e-ipo.co.id, diperbarui otomatis; estimasi penjatahan bukan hasil resmi.
          </p>
        </footer>
      </body>
    </html>
  );
}
