import { Link, useLocation } from 'react-router-dom';

function labelFromPath(pathname: string) {
  return pathname.replace('/', '') || 'dashboard';
}

function TopNav() {
  const location = useLocation();
  const label = labelFromPath(location.pathname);

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-[var(--dravix-border)] bg-white px-5 py-4 shadow-[var(--dravix-shadow-soft)]">
      <div>
        <div className="text-xs uppercase tracking-[0.24em] text-[var(--dravix-ink-soft)]">Dravix platform</div>
        <div className="mt-1 text-xl font-light text-[var(--dravix-ink)]">{label}</div>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Link to="/analysis" className="rounded-full bg-[var(--dravix-gradient-primary)] px-4 py-2 text-white">
          Run analysis
        </Link>
        <Link to="/dataset" className="rounded-full border border-[var(--dravix-border)] px-4 py-2 text-[var(--dravix-ink)]">
          Explore dataset
        </Link>
      </div>
    </header>
  );
}

export default TopNav;
