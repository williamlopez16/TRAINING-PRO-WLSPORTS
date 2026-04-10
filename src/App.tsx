/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import Login from './pages/Login';
import CoachDashboard from './pages/coach/CoachDashboard';
import AthleteDashboard from './pages/athlete/AthleteDashboard';

export default function App() {
  const user = useAppStore(state => state.user);

  return (
    <Router>
      <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans selection:bg-emerald-500/30">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'coach' ? '/coach' : '/athlete'} />} />
          
          <Route path="/coach/*" element={user?.role === 'coach' ? <CoachDashboard /> : <Navigate to="/login" />} />
          <Route path="/athlete/*" element={user?.role === 'athlete' ? <AthleteDashboard /> : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to={user ? (user.role === 'coach' ? '/coach' : '/athlete') : '/login'} />} />
        </Routes>
      </div>
    </Router>
  );
}
