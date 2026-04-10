import React from 'react';
import Navbar from './Navbar';
import ChatbotWidget from './ChatbotWidget';

export default function Layout({ children }) {
  return (
    <div className="layout">
      <Navbar />
      <main className="main-content">{children}</main>
      <ChatbotWidget />
    </div>
  );
}
