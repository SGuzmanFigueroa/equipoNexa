"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

// Menú ⋮ de cada fila. Usa posición fija (no absoluta) porque la tabla
// vive dentro de un contenedor con overflow que recortaría el desplegable.
export default function RowActions({
  memberId,
  memberName,
  onGenerateLetter,
}: {
  memberId: string;
  memberName: string;
  onGenerateLetter: (memberId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const menuHeight = 132;
    const below = r.bottom + 4 + menuHeight <= window.innerHeight;
    setPos({ top: below ? r.bottom + 4 : r.top - 4 - menuHeight, right: window.innerWidth - r.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700/50";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Acciones para ${memberName}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="12" cy="19" r="1.8" />
        </svg>
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: pos.top, right: pos.right }}
          className="fixed z-40 min-w-[190px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-black/5 dark:border-slate-700 dark:bg-slate-800"
        >
          <Link role="menuitem" href={`/members/${memberId}`} className={item} onClick={() => setOpen(false)}>
            Ver integrante
          </Link>
          <Link role="menuitem" href={`/members/${memberId}#informacion`} className={item} onClick={() => setOpen(false)}>
            Editar integrante
          </Link>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <button
            role="menuitem"
            type="button"
            className={`${item} font-medium text-nexa-blue dark:text-blue-300`}
            onClick={() => {
              setOpen(false);
              onGenerateLetter(memberId);
            }}
          >
            Generar carta
          </button>
        </div>
      )}
    </>
  );
}
