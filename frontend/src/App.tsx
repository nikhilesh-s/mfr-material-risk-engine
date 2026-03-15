import type { ComponentType } from 'react';
import { BarChart3, LayoutDashboard, Search, SlidersHorizontal } from 'lucide-react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import ScreeningPage from './pages/ScreeningPage';
import SimulatorPage from './pages/SimulatorPage';
import SingleMaterialPage from './pages/SingleMaterialPage';

type NavItem = {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Single Material Analysis', to: '/single-material', icon: Search },
  { label: 'Candidate Material Screening', to: '/screening', icon: BarChart3 },
  { label: 'Material Improvement Simulator', to: '/simulator', icon: SlidersHorizontal },
];

function App() {
  return (
    <div className="min-h-screen bg-[#F5F1EC] flex">
      <aside className="w-72 bg-[#FEFEFE] border-r border-[#232422]/10 px-5 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#232422]">Dravix</h1>
          <p className="text-sm text-[#232422]/60 mt-1">Engineering Tool Interface</p>
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
                      ? 'bg-[#24262E] text-[#FFDC6A]'
                      : 'text-[#232422]/75 hover:bg-[#F5F1EC]'
                  }`
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/single-material" element={<SingleMaterialPage />} />
          <Route path="/screening" element={<ScreeningPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
