'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Beranda' },
  { href: '/kalkulator', label: 'Kalkulator' },
  { href: '/underwriter', label: 'Underwriter' },
];

export default function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1">
      {NAV_LINKS.map(link => {
        const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? 'rounded-full bg-ember px-2 py-1.5 text-xs font-medium text-white sm:px-3 sm:text-sm'
                : 'rounded-full px-2 py-1.5 text-xs text-mute hover:text-fog sm:px-3 sm:text-sm'
            }
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
