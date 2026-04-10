import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUI } from '../hooks/useUI';
import { ROLES, ROUTES } from '../utils/constants';

export default function Navbar() {
  const { user, role, logout, isAuthenticated, loading } = useAuth();
  const { addNotification } = useUI();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      addNotification('Logged out successfully', 'success');
      navigate(ROUTES.AUTH, { replace: true });
      setIsMenuOpen(false);
    } catch (error) {
      addNotification('Logout failed', 'error');
    }
  };

  const getDashboardRoute = () => {
    if (role === ROLES.STUDENT) return ROUTES.STUDENT_DASHBOARD;
    if (role === ROLES.CLUB) return ROUTES.CLUB_DASHBOARD;
    if (role === ROLES.ADMIN) return ROUTES.ADMIN_DASHBOARD;
    return ROUTES.HOME;
  };

  return (
    <nav className="fixed top-0 w-full z-50 border-b-2 sm:border-b-4 border-black bg-white flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-headline">
      <div className="flex items-center gap-2 sm:gap-4">
        <Link to={ROUTES.HOME} className="flex items-center gap-1 sm:gap-2 text-lg sm:text-2xl font-black text-black uppercase tracking-tighter whitespace-nowrap hover:bg-yellow-400 px-2 py-1 transition-all">
          <span className="text-xl sm:text-3xl">🎉</span>
          <span className="hidden xs:inline">CampusPulse</span>
        </Link>

        <div className="hidden md:flex gap-2 items-center font-headline font-black uppercase tracking-tighter text-xs sm:text-sm">
          {isAuthenticated && !loading && (
            <>
              <Link
                className="text-black border-2 sm:border-2 border-black px-3 sm:px-4 py-2 min-h-[44px] flex items-center hover:bg-primary-container transition-all duration-100 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                to={getDashboardRoute()}
              >
                📊 Dashboard
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Desktop Actions */}
      <div className="flex items-center gap-2 sm:gap-3 hidden md:flex">
        {isAuthenticated && !loading ? (
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 border-3 sm:border-4 border-black bg-white hover:bg-primary-container transition-all font-label font-black uppercase text-xs min-h-[44px] shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] sm:hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
            >
              <span className="truncate max-w-[100px] text-xs">{user?.email?.split('@')[0]}</span>
              <span className="bg-black text-primary-container px-2 py-1 text-xs font-black">
                {role === ROLES.ADMIN ? '👤' : role === ROLES.CLUB ? '🎭' : '🎓'}
              </span>
            </button>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 bg-white border-3 sm:border-4 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-[100] overflow-hidden min-w-max">
                <button
                  onClick={() => {
                    navigate(`${getDashboardRoute()}/profile`);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 sm:px-4 py-3 min-h-[44px] flex items-center text-black hover:bg-primary-container transition-colors font-label font-bold border-b-2 border-black uppercase text-xs"
                >
                  👤 Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 sm:px-4 py-3 min-h-[44px] flex items-center text-white hover:bg-error-container transition-colors font-label font-bold bg-black border-2 border-black uppercase text-xs"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link
            to={ROUTES.AUTH}
            className="bg-primary-container text-black px-4 sm:px-5 py-2 border-3 sm:border-4 border-black font-headline font-black uppercase tracking-tighter text-xs sm:text-sm min-h-[44px] flex items-center shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] sm:hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all"
          >
            Join/Login
          </Link>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden flex flex-col gap-1.5 cursor-pointer ml-auto min-w-[44px] min-h-[44px] justify-center items-center p-2"
      >
        <span
          className={`block w-6 h-0.5 bg-black transition-all duration-300 ${
            isMenuOpen ? 'rotate-45 translate-y-2' : ''
          }`}
        ></span>
        <span
          className={`block w-6 h-0.5 bg-black transition-all duration-300 ${
            isMenuOpen ? 'opacity-0' : ''
          }`}
        ></span>
        <span
          className={`block w-6 h-0.5 bg-black transition-all duration-300 ${
            isMenuOpen ? '-rotate-45 -translate-y-2' : ''
          }`}
        ></span>
      </button>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 right-0 left-0 bg-white border-b-2 sm:border-b-4 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="px-3 sm:px-4 py-2 sm:py-3 space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  to={getDashboardRoute()}
                  className="block min-h-[44px] flex items-center px-3 py-3 text-black font-label font-black border-2 sm:border-2 border-black uppercase hover:bg-primary-container hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 text-xs"
                  onClick={() => setIsMenuOpen(false)}
                >
                  📊 Dashboard
                </Link>
                {role === ROLES.ADMIN && (
                  <Link
                    to={ROUTES.ADMIN_DASHBOARD}
                    className="block min-h-[44px] flex items-center px-3 py-3 text-black font-label font-black border-2 sm:border-2 border-black uppercase hover:bg-secondary-container hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 text-xs"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    ⚙️ Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    navigate(`${getDashboardRoute()}/profile`);
                    setIsMenuOpen(false);
                  }}
                  className="block w-full min-h-[44px] text-left px-3 py-3 flex items-center text-black font-label font-black border-2 sm:border-2 border-black uppercase hover:bg-primary-container hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 text-xs"
                >
                  👤 Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full min-h-[44px] text-left px-3 py-3 flex items-center text-white bg-black font-label font-black border-3 sm:border-4 border-black uppercase hover:bg-error-container hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] transition-all hover:-translate-y-1 text-xs"
                >
                  🚪 Logout
                </button>
              </>
            ) : (
              <Link
                to={ROUTES.AUTH}
                className="block min-h-[44px] flex items-center justify-center px-3 py-3 text-black bg-primary-container font-label font-black border-3 sm:border-4 border-black text-center uppercase shadow-[2px_2px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)] sm:hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all text-xs"
                onClick={() => setIsMenuOpen(false)}
              >
                Join / Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}


