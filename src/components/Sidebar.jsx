import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Sidebar({ title, subtitle, navItems, activeIndex, onNewEvent }) {
  const { logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 p-4 bg-secondary flex flex-col border-r-4 border-black shadow-[8px_0px_0px_0px_rgba(0,0,0,1)] hidden md:flex z-40">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-headline text-xl text-white font-black italic uppercase tracking-tighter">
          {title}
        </h1>
        <p className="font-label text-xs text-white/80 uppercase tracking-widest mt-1">
          {subtitle}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4">
        {navItems.map((item, idx) => (
          <Link
            key={idx}
            to={item.path || '#'}
            className={`flex items-center gap-3 p-3 transition-all hover:translate-x-1 font-label font-bold text-sm rounded ${
              idx === activeIndex
                ? 'bg-primary-container text-black border-2 border-black neo-shadow-md'
                : 'text-white hover:bg-blue-500/50'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto pt-6 border-t-2 border-white/20 space-y-3">
        <button
          onClick={onNewEvent}
          className="w-full bg-primary-container text-black p-3 font-headline uppercase text-xs tracking-tighter font-black neo-shadow-md hover:-translate-y-1 transition-all"
        >
          New Event
        </button>
        <Link
          to="/"
          onClick={logout}
          className="flex items-center justify-center gap-3 p-3 text-white hover:bg-red-600/50 transition-colors font-label font-bold text-sm rounded"
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Logout</span>
        </Link>
      </div>
    </aside>
  );
}
