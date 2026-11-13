export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted">
        <p>
          FireCompass · NASA Space Apps Challenge 2026 · challenge <em>Flame in Freefall</em>. Data from NASA&apos;s public{" "}
          <a className="link" href="https://psi.nasa.gov" target="_blank" rel="noreferrer">
            Physical Sciences Informatics (PSI)
          </a>{" "}
          repository. See the <a className="link" href="/references">References</a> page for every source and library used.
        </p>
        <p className="mt-2">
          An independent project, not affiliated with or endorsed by NASA. Every data point shows its source; anything
          unverified is marked as pending and never invented.
        </p>
      </div>
    </footer>
  );
}
