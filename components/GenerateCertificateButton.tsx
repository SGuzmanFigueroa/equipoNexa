"use client";

import { useRef, useState } from "react";
import { useToast } from "@/components/Toast";

// Botón de la ficha (solo admin, integrante ya retirado): descarga el certificado de participación
// en PDF con los datos de la pestaña Nexa y lo descarga.
export default function GenerateCertificateButton({ memberId }: { memberId: string }) {
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);
  const { push } = useToast();

  const generate = async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/certificado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integranteId: memberId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "No pudimos generar el certificado. Inténtalo nuevamente.");
      }
      const blob = await res.blob();
      const match = /filename\*=UTF-8''([^;]+)/.exec(res.headers.get("content-disposition") ?? "");
      const name = match ? decodeURIComponent(match[1]) : "Certificado de participación.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      push("Certificado generado. Revisa tus descargas.", "success");
    } catch (e) {
      push(e instanceof Error ? e.message : "No pudimos generar el certificado.", "error");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={generate}
      disabled={loading}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-nexa-blue/30 bg-white px-3 text-sm font-medium text-nexa-blue transition-colors hover:bg-nexa-light disabled:cursor-not-allowed disabled:opacity-70 dark:border-blue-800 dark:bg-slate-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="9" r="6" />
          <path d="m8.5 13.8-1.5 7.2 5-3 5 3-1.5-7.2" />
        </svg>
      )}
      {loading ? "Generando..." : "Descargar certificado"}
    </button>
  );
}
