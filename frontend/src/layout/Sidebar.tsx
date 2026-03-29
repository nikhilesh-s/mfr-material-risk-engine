import type { ComponentType } from 'react';
import {
  Bot,
  Boxes,
  FlaskConical,
  LayoutDashboard,
  Layers3,
  Microscope,
  Radar,
  ScanSearch,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logoSrc from '../assets/dravix_brand.svg';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analysis', label: 'Analysis', icon: ShieldCheck },
  { to: '/optimization', label: 'Optimization', icon: Radar },
  { to: '/ranking', label: 'Ranking', icon: Layers3 },
  { to: '/comparison', label: 'Comparison', icon: Boxes },
  { to: '/simulation', label: 'Simulation', icon: SlidersHorizontal },
  { to: '/history', label: 'History', icon: Microscope },
  { to: '/coatings', label: 'Coatings', icon: FlaskConical },
  { to: '/dataset', label: 'Dataset', icon: ScanSearch },
  { to: '/advisor', label: 'Advisor', icon: Bot },
  { to: '/reports', label: 'Reports', icon: Radar },
];

function Sidebar() {
  return (
    <aside className="w-full rounded-[2rem] border border-[var(--dravix-border)] bg-white p-6 shadow-[var(--dravix-shadow-soft)] lg:w-80 lg:shrink-0">
      <div className="rounded-[1.75rem] border border-white/10 bg-[var(--dravix-gradient-primary)] p-5 text-white">
        <img src={logoSrc} alt="Dravix" className="w-40 max-w-full" />
        <p className="mt-4 text-sm leading-6 text-white/80">
          Phase 3 materials fire-risk platform for analysis, optimization, ranking, and research visibility.
        </p>
      </div>
      <nav className="mt-6 grid gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                  isActive
                    ? 'bg-[var(--dravix-gradient-primary)] text-white shadow-[0_12px_30px_rgba(118,33,35,0.15)]'
                    : 'bg-[var(--dravix-panel)] text-[var(--dravix-ink)] hover:bg-white'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
