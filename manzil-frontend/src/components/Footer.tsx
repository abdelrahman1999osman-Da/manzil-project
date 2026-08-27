import { Link } from "react-router-dom";
import { Home } from "lucide-react";

const footerLinks = [
  { label: "Home", href: "/" },
  { label: "Estimate", href: "/estimate" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "AI Assistant", href: "/assistant" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto max-w-[1280px] px-8 py-16 max-md:px-5 max-md:py-10">
        <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <Home className="size-4 text-bg" strokeWidth={2} />
            </span>
            <span className="text-base font-bold tracking-tight">Manzil</span>
          </Link>

          {/* Links */}
          <ul className="flex gap-8 max-md:gap-6">
            {footerLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className="text-sm text-text-muted transition-colors hover:text-text-secondary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Divider */}
        <div className="my-8 h-px bg-border-subtle" />

        {/* Copyright */}
        <p className="text-center text-sm text-text-muted">
          &copy; {new Date().getFullYear()} Manzil. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
