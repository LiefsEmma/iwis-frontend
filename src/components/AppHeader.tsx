"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/data-analysis", label: "Data Analysis" },
  { href: "/reports", label: "Reports" },
  { href: "/alerts", label: "Alerts" },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="iwis-header">
      <div className="iwis-header__inner">
        <h1 className="iwis-title">Integrated Water Information System</h1>

        <nav aria-label="Primary">
          <ul className="iwis-nav">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`iwis-nav__link ${isActive ? "is-active" : ""}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
