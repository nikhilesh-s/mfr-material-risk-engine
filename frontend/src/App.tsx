import type { ComponentType } from 'react';
import { useEffect } from 'react';
import {
  BarChart3,
  LayoutDashboard,
  Microscope,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import logoSrc from './assets/dravix_brand.svg';
import DashboardPage from './pages/DashboardPage';
import MethodologyPage from './pages/MethodologyPage';
import RankingPage from './pages/RankingPage';
import SimulatorPage from './pages/SimulatorPage';
import SingleMaterialPage from './pages/SingleMaterialPage';
import { applyDesignSystemToDocument, designSystem } from './theme/designSystem';

type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Workflow', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Single Screening', to: '/single-material', icon: Search },
  { label: 'Batch Ranking', to: '/screening', icon: BarChart3 },
  { label: 'Sensitivity', to: '/simulator', icon: SlidersHorizontal },
  { label: 'Methodology', to: '/methodology', icon: Microscope },
];

function App() {
  useEffect(() => {
    applyDesignSystemToDocument();
  }, []);

  return (
    <div className="min-h-screen text-slate-900" style={{ backgroundColor: designSystem.backgroundColors.app }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1520px] gap-6 px-4 py-4 lg:px-6">
        <aside className="w-80 shrink-0 rounded-[2rem] border px-6 py-7 shadow-[0_20px_80px_rgba(49,35,22,0.08)] backdrop-blur dravix-card">
          <div className="mb-8 rounded-[1.75rem] border p-5 text-white" style={{ background: designSystem.accentGradient, borderColor: 'rgba(254,254,254,0.12)' }}>
            <img src={logoSrc} alt="Dravix" className="w-44 max-w-full" />
            <p className="mt-4 text-sm leading-6 text-white/72">
              Phase-3 engineering decision support for materials fire-risk screening,
              prioritization, and what-if exploration.
            </p>
          </div>

          <div className="mb-6 rounded-[1.5rem] border px-4 py-4 text-sm text-[#4d4034] dravix-panel">
            Workflow:
            <div className="mt-2 space-y-2 text-[#2b2118]">
              <div>1. Import candidate materials</div>
              <div>2. Run Dravix screening</div>
              <div>3. View ranked shortlist</div>
              <div>4. Export recommended test candidates</div>
            </div>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (
                    `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition-colors ${
                      isActive
                        ? 'text-[#232422] shadow-[0_12px_30px_rgba(35,26,20,0.18)] dravix-button-primary'
                        : 'text-[#46372b] hover:bg-[#F5F1EC]'
                    }`
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <main className="dravix-shell min-w-0 flex-1 rounded-[2.25rem] border border-white/60 p-6 shadow-[0_20px_80px_rgba(49,35,22,0.08)] backdrop-blur md:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/single-material" element={<SingleMaterialPage />} />
            <Route path="/screening" element={<RankingPage />} />
            <Route path="/simulator" element={<SimulatorPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
