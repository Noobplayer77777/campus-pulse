import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '../services/calendarService';
import { useUI } from '../hooks/useUI';

/**
 * OAuth Callback Page for Google Calendar
 * Handles the redirect from Google OAuth consent screen
 */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const { showToast } = useUI();
  const [status, setStatus] = useState('processing');

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get authorization code from URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
          setStatus('error');
          showToast(`❌ Authorization failed: ${error}`, 'error');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          showToast('❌ No authorization code received', 'error');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Exchange code for access token
        await exchangeCodeForToken(code);
        setStatus('success');
        showToast('✅ Google Calendar connected successfully!', 'success');

        // Redirect back to previous page or home
        setTimeout(() => {
          const returnUrl = sessionStorage.getItem('oauth_return_url') || '/';
          navigate(returnUrl);
          sessionStorage.removeItem('oauth_return_url');
        }, 2000);
      } catch (error) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        showToast(`❌ Authentication error: ${error.message}`, 'error');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleOAuthCallback();
  }, [navigate, showToast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-black text-center">
        {status === 'processing' && (
          <>
            <div className="text-4xl mb-4">🔄</div>
            <h2 className="text-2xl font-headline font-black mb-2">Connecting to Google Calendar</h2>
            <p className="text-gray-600">Please wait while we complete the authentication...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="text-2xl font-headline font-black mb-2">Connected!</h2>
            <p className="text-gray-600">Google Calendar has been connected successfully.</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting you back...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-2xl font-headline font-black mb-2">Authentication Failed</h2>
            <p className="text-gray-600">There was an error connecting to Google Calendar.</p>
            <p className="text-sm text-gray-500 mt-4">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
}
