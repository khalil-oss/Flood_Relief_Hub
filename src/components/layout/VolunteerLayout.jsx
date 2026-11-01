import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import VolunteerSidebar from './VolunteerSidebar';
import VolunteerHeader from './VolunteerHeader';
import { useAuth } from '../../context/AuthContext';

const VolunteerLayout = () => {
  const { user, loading, isVolunteer } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (!user || !isVolunteer) return null;

  return (
    <div className="app-shell">
      <VolunteerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <VolunteerHeader onMenuClick={() => setSidebarOpen(true)} sidebarOpen={sidebarOpen} />
        <main className="main-inner">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default VolunteerLayout;