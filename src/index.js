import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { EventsProvider } from './context/EventsContext';
import { UIProvider } from './context/UIContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <EventsProvider>
        <UIProvider>
          <App />
        </UIProvider>
      </EventsProvider>
    </AuthProvider>
  </React.StrictMode>
);

// Render the app

