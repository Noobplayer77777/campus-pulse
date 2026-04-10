/**
 * Google Calendar Integration Service
 * Manages calendar events and synchronization
 */

// Use function instead of constant to allow runtime env var changes (for testing)
const getAPIKey = () => process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY;
const getClientId = () => process.env.REACT_APP_GOOGLE_CLIENT_ID;
const getClientSecret = () => process.env.REACT_APP_GOOGLE_CLIENT_SECRET;
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';
const OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Store for OAuth token (in production, use secure storage)
let cachedAccessToken = null;

/**
 * Initialize Google Calendar OAuth
 * Opens consent screen for user authorization
 */
export const initializeGoogleCalendar = () => {
  const clientId = getClientId();
  const redirectUri = `${window.location.origin}/oauth-callback`;
  
  if (!clientId) {
    console.error('Google Client ID not configured');
    return;
  }

  const scope = 'https://www.googleapis.com/auth/calendar';
  const responseType = 'code';
  const accessType = 'offline';
  const prompt = 'consent';

  const authUrl = `${OAUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(scope)}&access_type=${accessType}&prompt=${prompt}`;
  
  window.location.href = authUrl;
};

/**
 * Exchange authorization code for access token
 * @param {string} authCode - Authorization code from OAuth callback
 * @returns {Promise<string>} Access token
 */
export const exchangeCodeForToken = async (authCode) => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const redirectUri = `${window.location.origin}/oauth-callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  try {
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    
    // Store token (with expiration)
    sessionStorage.setItem('google_calendar_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('google_calendar_refresh_token', data.refresh_token);
    }

    return data.access_token;
  } catch (error) {
    console.error('Error exchanging auth code for token:', error);
    throw error;
  }
};

/**
 * Get stored access token
 * @returns {string|null} Cached or stored access token
 */
export const getAccessToken = () => {
  if (cachedAccessToken) return cachedAccessToken;
  return sessionStorage.getItem('google_calendar_token');
};

/**
 * Check if user is authenticated with Google Calendar
 * @returns {boolean} User has valid access token
 */
export const isGoogleCalendarAuthenticated = () => {
  return !!getAccessToken();
};

/**
 * Export single event to Google Calendar
 * @param {Object} eventData - Event to export
 * @param {string} eventData.name - Event name
 * @param {string} eventData.description - Event description
 * @param {string} eventData.date - Event date (YYYY-MM-DD)
 * @param {string} eventData.time - Event start time (HH:MM)
 * @param {string} eventData.endTime - Event end time (HH:MM)
 * @param {string} eventData.location - Event location
 * @returns {Promise<Object>} Created Google Calendar event
 */
export const exportEventToGoogleCalendar = async (eventData) => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Calendar. Please authorize first.');
  }

  try {
    // Parse start and end times
    const [dateYear, dateMonth, dateDay] = eventData.date.split('-').map(Number);
    const [startHour, startMin] = eventData.time.split(':').map(Number);
    const [endHour, endMin] = eventData.endTime.split(':').map(Number);

    const startDateTime = new Date(dateYear, dateMonth - 1, dateDay, startHour, startMin);
    const endDateTime = new Date(dateYear, dateMonth - 1, dateDay, endHour, endMin);

    const calendarEvent = {
      summary: eventData.name,
      description: eventData.description || '',
      location: eventData.location || '',
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: 'UTC'
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: 'UTC'
      },
      reminders: {
        useDefault: true
      }
    };

    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calendarEvent)
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        sessionStorage.removeItem('google_calendar_token');
        cachedAccessToken = null;
        throw new Error('Google Calendar session expired. Please re-authenticate.');
      }
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const createdEvent = await response.json();
    return {
      success: true,
      eventId: createdEvent.id,
      eventLink: createdEvent.htmlLink,
      message: 'Event exported to Google Calendar successfully!'
    };
  } catch (error) {
    console.error('Error exporting event to Google Calendar:', error);
    throw error;
  }
};

/**
 * Export multiple events to Google Calendar
 * @param {Array} events - Array of events to export
 * @returns {Promise<Object>} Export results
 */
export const exportEventsToGoogleCalendar = async (events) => {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google Calendar. Please authorize first.');
  }

  const results = {
    successful: [],
    failed: [],
    total: events.length
  };

  for (const event of events) {
    try {
      const result = await exportEventToGoogleCalendar(event);
      results.successful.push({
        name: event.name,
        eventLink: result.eventLink
      });
    } catch (error) {
      results.failed.push({
        name: event.name,
        error: error.message
      });
    }
  }

  return results;
};

/**
 * Revoke Google Calendar access
 * @returns {Promise<void>}
 */
export const revokeGoogleCalendarAccess = async () => {
  const token = getAccessToken();
  if (!token) return;

  try {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `token=${token}`
    });
  } catch (error) {
    console.error('Error revoking access:', error);
  } finally {
    sessionStorage.removeItem('google_calendar_token');
    localStorage.removeItem('google_calendar_refresh_token');
    cachedAccessToken = null;
  }
};

/**
 * Fetch events from Google Calendar
 * @param {string} calendarId - Calendar ID (primary for user's calendar)
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of calendar events
 */
export const fetchCalendarEvents = async (calendarId = 'primary', options = {}) => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn('Google Calendar API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      maxResults: options.maxResults || 10,
      orderBy: 'startTime',
      singleEvents: true,
      timeMin: options.timeMin || new Date().toISOString(),
      timeMax: options.timeMax || undefined,
      ...options.filters
    });

    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events?${params}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
};

/**
 * Format Google Calendar event for display
 * @param {Object} event - Google Calendar event object
 * @returns {Object} Formatted event
 */
export const formatCalendarEvent = (event) => {
  return {
    id: event.id,
    title: event.summary,
    description: event.description,
    start: event.start.dateTime || event.start.date,
    end: event.end.dateTime || event.end.date,
    location: event.location,
    url: event.htmlLink,
    attendees: event.attendees || [],
    organizer: event.organizer,
    status: event.status,
    created: event.created,
    updated: event.updated
  };
};

/**
 * Search calendar events
 * @param {string} query - Search query
 * @param {string} calendarId - Calendar ID
 * @returns {Promise<Array>} Matching events
 */
export const searchCalendarEvents = async (query, calendarId = 'primary') => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn('Google Calendar API key not configured');
    return [];
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      maxResults: 25,
      orderBy: 'startTime',
      singleEvents: true,
      timeMin: new Date().toISOString()
    });

    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events?${params}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Calendar search error: ${response.status}`);
    }

    const data = await response.json();
    return (data.items || []).map(formatCalendarEvent);
  } catch (error) {
    console.error('Error searching calendar:', error);
    return [];
  }
};

/**
 * Get event details
 * @param {string} eventId - Event ID
 * @param {string} calendarId - Calendar ID
 * @returns {Promise<Object>} Event details
 */
export const getCalendarEvent = async (eventId, calendarId = 'primary') => {
  const apiKey = getAPIKey();
  if (!apiKey) {
    console.warn('Google Calendar API key not configured');
    return null;
  }

  try {
    const params = new URLSearchParams({
      key: apiKey
    });

    const response = await fetch(
      `${CALENDAR_API_URL}/calendars/${calendarId}/events/${eventId}?${params}`,
      {
        headers: { 'Accept': 'application/json' }
      }
    );

    if (!response.ok) {
      throw new Error(`Event fetch error: ${response.status}`);
    }

    const event = await response.json();
    return formatCalendarEvent(event);
  } catch (error) {
    console.error('Error fetching event details:', error);
    return null;
  }
};

/**
 * Check if API is configured
 * @returns {boolean} API key present
 */
export const isCalendarConfigured = () => {
  // Check runtime environment variable instead of cached constant for test compatibility
  return !!process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY;
};

export default {
  // Read operations (API key based)
  fetchCalendarEvents,
  formatCalendarEvent,
  searchCalendarEvents,
  getCalendarEvent,
  isCalendarConfigured,
  
  // OAuth operations (write access)
  initializeGoogleCalendar,
  exchangeCodeForToken,
  getAccessToken,
  isGoogleCalendarAuthenticated,
  
  // Export operations
  exportEventToGoogleCalendar,
  exportEventsToGoogleCalendar,
  revokeGoogleCalendarAccess
};
