import React, { useState } from 'react';
import {
  initializeGoogleCalendar,
  isGoogleCalendarAuthenticated,
  exportEventToGoogleCalendar,
  revokeGoogleCalendarAccess
} from '../services/calendarService';
import { useUI } from '../hooks/useUI';

/**
 * Google Calendar Export Component
 * Button to authenticate with Google Calendar and export events
 */
export default function GoogleCalendarExport({ event, variant = 'button' }) {
  const [loading, setLoading] = useState(false);
  const isAuthenticated = isGoogleCalendarAuthenticated();
  const { showToast } = useUI();

  const handleExportClick = async () => {
    if (!isAuthenticated) {
      // Initiate OAuth flow
      initializeGoogleCalendar();
      return;
    }

    // Export the event
    setLoading(true);
    try {
      const result = await exportEventToGoogleCalendar(event);
      showToast(`✅ ${result.message}`, 'success');
    } catch (error) {
      showToast(`❌ Export failed: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await revokeGoogleCalendarAccess();
    showToast('✅ Google Calendar disconnected', 'success');
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleExportClick}
        disabled={loading}
        title={isAuthenticated ? 'Export to Google Calendar' : 'Connect Google Calendar'}
        className="p-2 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
      >
        {isAuthenticated ? '📅' : '🔗'} {loading ? '...' : ''}
      </button>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      {isAuthenticated ? (
        <>
          <button
            onClick={handleExportClick}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Exporting...' : '📅 Export to Google Calendar'}
          </button>
          <button
            onClick={handleLogout}
            className="px-2 py-2 text-gray-600 hover:text-gray-900 text-sm"
            title="Disconnect Google Calendar"
          >
            ✕
          </button>
        </>
      ) : (
        <button
          onClick={handleExportClick}
          className="px-4 py-2 bg-gray-800 text-white rounded font-semibold hover:bg-gray-900 transition-all flex items-center gap-2"
        >
          <span>🔗</span> Connect Google Calendar
        </button>
      )}
    </div>
  );
}
