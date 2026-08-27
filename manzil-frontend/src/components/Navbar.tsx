import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Estimate", href: "/estimate" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "AI Assistant", href: "/assistant" },
  { label: "Admin", href: "/admin" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="sticky top-0 z-50 h-[72px] border-b border-border-subtle bg-bg/80 backdrop-blur-xl"
    >
      <nav className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-8 max-md:px-5">
        {/* Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary">
            <Home className="size-4.5 text-bg" strokeWidth={2} />
          </span>
          <span className="text-lg font-bold tracking-tight">Manzil</span>
        </Link>

        {/* Desktop Nav — centered */}
        <ul className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200",
                  location.pathname === link.href
                    ? "bg-white/5 text-text"
                    : "text-text-secondary hover:bg-white/5 hover:text-text",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <Link
            to="/estimate"
            className="inline-flex h-10 items-center rounded-[14px] bg-primary px-6 text-sm font-semibold text-bg transition-all duration-200 hover:scale-[1.02] hover:bg-primary-hover active:scale-[0.98]"
          >
            Get Estimate
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex size-10 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-white/5 md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-border-subtle bg-bg/95 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                    location.pathname === link.href
                      ? "bg-white/5 text-text"
                      : "text-text-secondary hover:bg-white/5 hover:text-text",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/estimate"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex h-12 items-center justify-center rounded-[16px] bg-primary px-7 text-sm font-semibold text-bg"
              >
                Get Estimate
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
