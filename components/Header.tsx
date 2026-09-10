import Link from "next/link";
import { signOut } from "@/app/login/actions";
import type { Profile } from "@/lib/types";
import ThemeToggle from "./ThemeToggle";
import NavLink from "./NavLink";

export default function Header({ profile }: { profile: Profile }) {
  return (
    <header className="bg-nexa-navy px-4 py-3 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-nexa-sky to-nexa-blue text-sm font-bold text-white">
            N
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight text-white">Equipo Nexa</p>
            <p className="text-xs leading-tight text-blue-200/70">Integrantes</p>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/dashboard">Integrantes</NavLink>
          <NavLink href="/projects">Proyectos</NavLink>
          <NavLink href="/schedule">Horarios</NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <span className="hidden text-sm text-blue-100/80 sm:inline">
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
      </div>
    </header>
  );
}
