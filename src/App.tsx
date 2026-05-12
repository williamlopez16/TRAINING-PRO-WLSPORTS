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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <div className="w-full max-w-md md:max-w-none mx-auto min-h-screen bg-white shadow-xl relative flex flex-col">
          {view === 'home' && <Home onNavigate={navigate} />}
          {view === 'course' && <CourseDetail courseId={activeCourseId!} onNavigate={navigate} />}
          {view === 'generator' && <GroupGenerator courseId={activeCourseId!} onNavigate={navigate} />}
          {view === 'tournament' && (
            <TournamentCreator 
              courseId={activeCourseId!} 
              onBack={() => setView('course')} 
              setView={navigate} 
              initialTeams={navExtra}
            />
          )}
      </div>
    </div>
  );
}
