import React, { useState } from 'react';
import { Home } from './pages/Home';
import { CourseDetail } from './pages/CourseDetail';
import { GroupGenerator } from './pages/GroupGenerator';

export type View = 'home' | 'course' | 'generator';

export default function App() {
  const [view, setView] = useState<View>('home');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  
  const navigate = (newView: View, courseId?: string) => {
    setView(newView);
    if (courseId !== undefined) {
      setActiveCourseId(courseId);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-xl relative flex flex-col">
          {view === 'home' && <Home onNavigate={navigate} />}
          {view === 'course' && <CourseDetail courseId={activeCourseId!} onNavigate={navigate} />}
          {view === 'generator' && <GroupGenerator courseId={activeCourseId!} onNavigate={navigate} />}
      </div>
    </div>
  );
}
