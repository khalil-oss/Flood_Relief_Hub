import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Building2, 
  X,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const volunteerNavigation = [
  { path: '/volunteer-dashboard', label: 'My Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
];

const VolunteerSidebar = ({ isOpen, onClose }) => {
  const { hasPermission, volunteerRecord, logout } = useAuth();
  const location = useLocation();

  const filteredNav = volunteerNavigation.filter(item => 
    hasPermission(item.permission)
  );

  return (
    <>
      <button
        className="sidebar-toggle"
        onClick={onClose}
        aria-label="Close sidebar"
      >
        <X className="w-6 h-6 text-surface-700" />
      </button>
      
      <aside 
        className="sidebar"
        aria-label="Main navigation"
      >
        <div className="sidebar-inner">
          <div className="sidebar-brand">
            <h1 className="text-white font-bold text-xl flex items-center gap-3">
              <div className="sidebar-logo">
                <span className="w-5 h-5 text-white font-bold">🤝</span>
              </div>
              ReliefHub
            </h1>
            <p className="sidebar-subtitle">Volunteer Portal</p>
          </div>
          
          {volunteerRecord && (
            <div className="p-4 border-b border-deep-700 bg-deep-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{volunteerRecord.name}</p>
                  <p className="text-white/60 text-xs capitalize">{volunteerRecord.skill}</p>
                </div>
              </div>
            </div>
          )}
          
          <nav className="sidebar-nav" role="navigation" aria-label="Main">
            {filteredNav.map(item => {
              const Icon = item.icon;
              const isActive = item.fragment 
                ? location.pathname === item.path && location.hash === `#${item.fragment}`
                : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <NavLink
                  key={item.path + (item.fragment || '')}
                  to={item.fragment ? `${item.path}#${item.fragment}` : item.path}
                  onClick={onClose}
                  className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          
          <div className="sidebar-footer">
            <button
              onClick={() => { logout(); onClose(); }}
              className="w-full text-left px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3"
            >
              <LogOut className="w-5 h-5" aria-hidden="true" />
              <span>Logout</span>
            </button>
            <p className="sidebar-footer-text mt-4">
              Together for a safer tomorrow
            </p>
          </div>
        </div>
      </aside>
      
      {isOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default VolunteerSidebar;