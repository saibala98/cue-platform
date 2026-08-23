import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const LINK_CLASS = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-brand-green' : 'text-brand-muted hover:text-brand-pink'
  }`;

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="border-b border-brand-green bg-brand-black">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="font-display text-lg font-semibold tracking-tight text-brand-green">CUE</span>
          <nav className="flex items-center gap-1">
            <NavLink to="/dashboard" className={LINK_CLASS} end>
              Dashboard
            </NavLink>
            {user?.role === 'new_joinee' && (
              <NavLink to="/training" className={LINK_CLASS}>
                Training
              </NavLink>
            )}
            {user?.role === 'new_joinee' && (
              <NavLink to="/mentee-view" className={LINK_CLASS} data-tour="nav-my-mentor">
                My Mentor
              </NavLink>
            )}
            {user?.role === 'new_joinee' && (
              <NavLink to="/knowledge-buddy" className={LINK_CLASS} data-tour="nav-knowledge-buddy">
                Knowledge Buddy
              </NavLink>
            )}
            {user?.role === 'new_joinee' && (
              <NavLink to="/knowledge-map" className={LINK_CLASS}>
                Knowledge Map
              </NavLink>
            )}
            {user?.role === 'mentor' && (
              <NavLink to="/mentor-view" className={LINK_CLASS} data-tour="nav-my-mentees">
                My Mentees
              </NavLink>
            )}
            {user?.role === 'people_leader' && (
              <NavLink to="/leader-dashboard" className={LINK_CLASS} data-tour="nav-leader-dashboard">
                Leader Dashboard
              </NavLink>
            )}
            {user?.role === 'people_leader' && (
              <NavLink to="/mentor-assignment" className={LINK_CLASS}>
                Assign Mentors
              </NavLink>
            )}
            {user?.role === 'people_leader' && (
              <NavLink to="/module-admin" className={LINK_CLASS}>
                Manage Modules
              </NavLink>
            )}
            {user?.role === 'people_leader' && (
              <NavLink to="/document-manager" className={LINK_CLASS}>
                Documents
              </NavLink>
            )}
            {user?.role === 'people_leader' && (
              <NavLink to="/knowledge-map-admin" className={LINK_CLASS}>
                Knowledge Map
              </NavLink>
            )}
            {user?.role === 'compliance_admin' && (
              <NavLink to="/compliance-dashboard" className={LINK_CLASS}>
                Compliance Dashboard
              </NavLink>
            )}
            {user?.role === 'compliance_admin' && (
              <NavLink to="/audit-log" className={LINK_CLASS} data-tour="nav-audit-log">
                Audit Log
              </NavLink>
            )}
            {user?.role === 'compliance_admin' && (
              <NavLink to="/module-versioning" className={LINK_CLASS}>
                Module Versions
              </NavLink>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-brand-muted sm:inline">
            <span className="text-white">
              {user?.firstName} {user?.lastName}
            </span>{' '}
            · <span className="font-mono text-brand-pink">{user?.role.replace('_', ' ')}</span>
          </span>
          <button type="button" onClick={() => void handleLogout()} className="btn-secondary px-3 py-1.5 text-xs">
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
