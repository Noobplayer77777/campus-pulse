import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import SignupForm from '../components/SignupForm';
import { useAuth } from '../hooks/useAuth';
import { ROUTES, ROLES } from '../utils/constants';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const navigate = useNavigate();
  const { user, role, isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated && user && role) {
      if (role === ROLES.STUDENT) {
        navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
      } else if (role === ROLES.CLUB) {
        navigate(ROUTES.CLUB_DASHBOARD, { replace: true });
      } else if (role === ROLES.ADMIN) {
        navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
      }
    }
  }, [isAuthenticated, user, role, navigate]);

  const handleAuthSuccess = (userData) => {
    if (userData.role === ROLES.STUDENT) {
      navigate(ROUTES.STUDENT_DASHBOARD, { replace: true });
    } else if (userData.role === ROLES.CLUB) {
      navigate(ROUTES.CLUB_DASHBOARD, { replace: true });
    } else if (userData.role === ROLES.ADMIN) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  };

  return (
    <div className="min-h-screen glass-bg flex items-center justify-center p-6 relative font-body">
      <div className="w-full max-w-[1200px] flex flex-col md:flex-row gap-12 items-center justify-center">
        {/* Brand Section */}
        <div className="w-full md:w-1/2 flex flex-col gap-6">
          <span className="font-headline font-black text-6xl md:text-8xl italic uppercase tracking-tighter leading-none text-black">
            Campus<br />
            <span className="text-primary-container [text-shadow:4px_4px_0px_#000]">Pulse</span>
          </span>
          <p className="font-body text-xl md:text-2xl text-on-surface-variant max-w-md leading-relaxed">
            The vibrant heartbeat of university life. Discover events, join clubs, build connections—all in one pulse-pounding space.
          </p>
          <Link to="/" className="font-label font-bold flex items-center gap-2 hover:underline text-black">
            Back to Home <span className="material-symbols-outlined">arrow_back</span>
          </Link>
        </div>

        {/* Auth Container */}
        <div className="w-full md:w-1/2">
          {/* Tab Toggle */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-4 px-6 font-headline font-black text-sm uppercase transition-all ${
                activeTab === 'login'
                  ? 'bg-primary-container text-black border-4 border-black neo-shadow-lg'
                  : 'bg-surface border-[3px] border-black text-black hover:bg-primary-container/20'
              }`}
            >
              Log In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-4 px-6 font-headline font-black text-sm uppercase transition-all ${
                activeTab === 'signup'
                  ? 'bg-primary-container text-black border-4 border-black neo-shadow-lg'
                  : 'bg-surface border-[3px] border-black text-black hover:bg-primary-container/20'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Auth Forms */}
          {activeTab === 'login' ? (
            <LoginForm onSuccess={handleAuthSuccess} />
          ) : (
            <SignupForm onSuccess={handleAuthSuccess} />
          )}

          {/* Footer Info */}
          <div className="mt-8 text-center text-on-surface-variant text-sm">
            <p className="mb-2">For admins and club accounts, please contact the administration office</p>
            <p className="text-xs opacity-70">Your data is secure and encrypted with Firebase</p>
          </div>
        </div>
      </div>

      {/* Marquee Bar */}
      <div className="fixed bottom-0 left-0 w-full h-12 bg-black flex items-center overflow-hidden whitespace-nowrap border-t-4 border-yellow-400">
        <div className="flex animate-marquee space-x-8 items-center">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="text-primary-container font-headline font-black uppercase text-sm tracking-widest"
            >
              Live Events Now: Hackathon • Music Night • Sports Fest • Club Fair • Comedy Show • Career expo •
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

