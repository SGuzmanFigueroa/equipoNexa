"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/types";
import ThemeToggle from "./ThemeToggle";
import NavLink from "./NavLink";

export default function Header({ profile, isLeader }: { profile: Profile; isLeader: boolean }) {
  const isAdmin = profile.role === "admin";
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = isAdmin
    ? [
        { href: "/dashboard", label: "Integrantes" },
        { href: "/projects", label: "Proyectos" },
        { href: "/schedule", label: "Horarios" },
      ]
    : isLeader
      ? [
          { href: "/dashboard", label: "Integrantes" },
          { href: "/me", label: "Mi horario" },
        ]
      : [{ href: "/me", label: "Mi horario" }];

  return (
    <header className="bg-nexa-navy px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-y-2">
        <Link
          href={isAdmin || isLeader ? "/dashboard" : "/me"}
          className="flex items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-nexa-sky to-nexa-blue text-sm font-bold text-white">
            N
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Equipo Nexa</p>
            <p className="text-xs leading-tight text-blue-200/70">Integrantes</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <span className="hidden text-sm text-blue-100/80 lg:inline">
            {profile.full_name ?? profile.email}
          </span>
          <ThemeToggle />
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-sm text-blue-200/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              Cerrar sesión
            </button>
          </form>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          className="flex h-10 w-10 items-center justify-center rounded-md text-white/90 transition-colors hover:bg-white/10 md:hidden"
        >
          {menuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div className="mx-auto max-w-5xl border-t border-white/10 pt-2 md:hidden">
          <nav className="flex flex-col gap-1 pb-2">
            {navItems.map((item) => (
              <div key={item.href} onClick={() => setMenuOpen(false)}>
                <NavLink href={item.href}>{item.label}</NavLink>
              </div>
            ))}
          </nav>
          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="truncate text-sm text-blue-100/80">
              {profile.full_name ?? profile.email}
            </span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md px-3 py-1.5 text-sm text-blue-200/80 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
