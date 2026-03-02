/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useAppContext } from './store';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import GuildDashboard from './pages/GuildDashboard';
import ToastContainer from './components/Toast';

const AppContent = () => {
  const { db, currentView, currentUser, setCurrentView } = useAppContext();

  if (!currentView) {
    return <Login />;
  }

  if (currentView.type === 'admin') {
    const userRole = currentUser ? db.users[currentUser]?.role : null;
    const canAccessAdmin = userRole === 'admin' || userRole === 'creator';
    
    if (!canAccessAdmin) {
      setCurrentView(null);
      return <Login />;
    }
    return <AdminDashboard />;
  }

  return <GuildDashboard guildId={currentView.guildId} />;
};

const AppContentWrapper = () => {
  const { isMuted } = useAppContext();
  const audioRef = React.useRef<HTMLAudioElement>(null);

  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      if (!isMuted) {
        audioRef.current.play().catch(err => console.log("Autoplay blocked or error:", err));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isMuted]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans">
      <audio
        ref={audioRef}
        src="https://bybjhpiusfnjlbhiesrp.supabase.co/storage/v1/object/public/bgm/Lineage.mp3"
        loop
        autoPlay
      />
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <AppContent />
      </React.Suspense>
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContentWrapper />
    </AppProvider>
  );
}
