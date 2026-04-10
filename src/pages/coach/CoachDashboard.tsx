import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Trophy, Wrench, LogOut } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { logout } from '../../lib/firebase';

import CoachHome from './CoachHome';
import CoachAthletes from './CoachAthletes';
import CoachCompetitions from './CoachCompetitions';
import CoachTools from './CoachTools';

export default function CoachDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAppStore(state => state.setUser);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // Ignore if not configured
    }
    setUser(null);
  };

  const navItems = [
    { path: '/coach', icon: Home, label: 'Inicio' },
    { path: '/coach/athletes', icon: Users, label: 'Atletas' },
    { path: '/coach/competitions', icon: Trophy, label: 'Retos' },
    { path: '/coach/tools', icon: Wrench, label: 'Tools' },
  ];

  return (
    <div className="min-h-screen bg-neutral-950 pb-20 md:pb-0 md:pl-20">
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 z-50 px-6 py-3 flex justify-between items-center pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                isActive ? "text-emerald-500" : "text-neutral-500 hover:text-neutral-300"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 bottom-0 w-20 bg-neutral-900 border-r border-neutral-800 flex-col items-center py-6 z-50">
        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-8">
          <Trophy className="w-6 h-6" />
        </div>
        
        <div className="flex-1 flex flex-col gap-4 w-full px-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-xl transition-colors",
                  isActive ? "bg-emerald-500/10 text-emerald-500" : "text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
                )}
              >
                <item.icon className="w-6 h-6" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          className="w-14 h-14 flex items-center justify-center text-neutral-500 hover:bg-neutral-800 hover:text-red-400 rounded-xl transition-colors mt-auto"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 md:hidden">
          <h1 className="text-xl font-bold text-white">ProTraining</h1>
          <button onClick={handleLogout} className="p-2 text-neutral-400 hover:text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <Routes>
          <Route path="/" element={<CoachHome />} />
          <Route path="/athletes" element={<CoachAthletes />} />
          <Route path="/competitions" element={<CoachCompetitions />} />
          <Route path="/tools/*" element={<CoachTools />} />
        </Routes>
      </main>
    </div>
  );
}
