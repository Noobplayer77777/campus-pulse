import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full border-t-4 border-black dark:border-yellow-400 mt-20 bg-black dark:bg-zinc-900 grid grid-cols-1 md:grid-cols-4 gap-8 px-10 py-16 text-white font-body">
      {/* Brand Section */}
      <div className="col-span-1">
        <div className="text-yellow-400 font-black text-2xl font-headline mb-4 uppercase italic tracking-tighter">
          CampusPulse
        </div>
        <p className="font-body text-sm text-white/70 mb-6 leading-relaxed">
          Empowering students to connect, create, and celebrate university life through a unified event ecosystem.
        </p>
        <div className="flex gap-4">
          <span className="material-symbols-outlined cursor-pointer hover:text-yellow-400 transition-colors">share</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-yellow-400 transition-colors">public</span>
          <span className="material-symbols-outlined cursor-pointer hover:text-yellow-400 transition-colors">mail</span>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h5 className="font-headline font-bold mb-4 text-yellow-400 uppercase tracking-tighter">Quick Links</h5>
        <ul className="space-y-2 text-white/70 text-sm">
          <li>
            <Link to="/" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Explore Events
            </Link>
          </li>
          <li>
            <a href="#" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Find Clubs
            </a>
          </li>
          <li>
            <Link to="/club-admin" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Post an Event
            </Link>
          </li>
          <li>
            <a href="#" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Campus Map
            </a>
          </li>
        </ul>
      </div>

      {/* Support */}
      <div>
        <h5 className="font-headline font-bold mb-4 text-yellow-400 uppercase tracking-tighter">Support</h5>
        <ul className="space-y-2 text-white/70 text-sm">
          <li>
            <a href="#" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Privacy
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Terms
            </a>
          </li>
          <li>
            <a href="#" className="hover:text-yellow-400 underline decoration-yellow-400/30 transition-colors">
              Contact
            </a>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h5 className="font-headline font-bold mb-4 text-yellow-400 uppercase tracking-tighter">Contact</h5>
        <p className="text-sm text-white/70 mb-2 font-body">Student Center, Level 2</p>
        <p className="text-sm text-white/70 mb-4 font-body">hello@campuspulse.edu</p>
        <div className="bg-zinc-800 p-4 border-2 border-zinc-700">
          <p className="font-label text-xs uppercase text-zinc-400">Office Hours</p>
          <p className="font-label font-bold text-yellow-400">MON-FRI: 9AM - 5PM</p>
        </div>
      </div>

      {/* Bottom */}
      <div className="col-span-full border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center text-xs opacity-50 font-label">
        <p>© 2026 CampusPulse. All Rights Reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <span>Accessibility</span>
          <span>Cookie Policy</span>
          <span>Security</span>
        </div>
      </div>
    </footer>
  );
}
