"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

const T = {
  en: {
    a: "JaPax · NASA Space Apps Challenge 2026 · challenge",
    b: "Data from NASA's public",
    c: " repository. See the",
    d: "page for every source and library used.",
    e: "An independent project, not affiliated with or endorsed by NASA. Every data point shows its source; anything unverified is marked as pending and never invented.",
    refs: "References",
  },
  es: {
    a: "JaPax · NASA Space Apps Challenge 2026 · reto",
    b: "Datos del repositorio público de NASA",
    c: ". Consulta la página de",
    d: "para ver todas las fuentes y bibliotecas utilizadas.",
    e: "Un proyecto independiente, sin afiliación ni respaldo de NASA. Cada dato muestra su fuente; lo que no está verificado se marca como pendiente y nunca se inventa.",
    refs: "Referencias",
  },
};

export default function Footer() {
  const t = useT(T);
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <p>
          {t.a} <em>Flame in Freefall</em>. {t.b}{" "}
          <a className="link" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">
            Physical Sciences Informatics (PSI)
          </a>
          {t.c}{" "}
          <Link className="link" href="/references">
            {t.refs}
          </Link>{" "}
          {t.d}
        </p>
        <p className="mt-2">{t.e}</p>
      </div>
    </footer>
  );
}
