/**
 * Google Calendar Integration Service
 * Manages calendar events and synchronization
 */

// Use function instead of constant to allow runtime env var changes (for testing)
const getAPIKey = () => process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY;
const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3';

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
  fetchCalendarEvents,
  formatCalendarEvent,
  searchCalendarEvents,
  getCalendarEvent,
  isCalendarConfigured
};
