import React, { useState } from 'react';
import { Home } from './pages/Home';
import { CourseDetail } from './pages/CourseDetail';
import { GroupGenerator } from './pages/GroupGenerator';
import { TournamentCreator } from './pages/TournamentCreator';

export type View = 'home' | 'course' | 'generator' | 'tournament';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [navExtra, setNavExtra] = useState<any>(null);
  
  const navigate = (newView: View, courseId?: string, extra?: any) => {
    setView(newView);
    if (courseId !== undefined) {
      setActiveCourseId(courseId);
    }
    setNavExtra(extra || null);
  };

  return (
    <div className="w-full min-h-[100dvh] bg-[#06080e] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <div className="w-full max-w-2xl lg:max-w-4xl mx-auto min-h-[100dvh] bg-[#080c14] relative flex flex-col shadow-2xl safe-bottom border-x border-amber-900/20">
          {view === 'home' && <Home onNavigate={navigate} />}
          {view === 'course' && <CourseDetail courseId={activeCourseId!} onNavigate={navigate} />}
          {view === 'generator' && <GroupGenerator courseId={activeCourseId!} onNavigate={navigate} />}
          {view === 'tournament' && (
            <TournamentCreator 
              courseId={activeCourseId!} 
              onBack={() => { setView('course'); setNavExtra(null); }} 
              setView={navigate} 
              initialTeams={navExtra}
              onClearInitialTeams={() => setNavExtra(null)}
            />
          )}
      </div>
    </div>
  );
}
