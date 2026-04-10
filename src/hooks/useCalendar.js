/**
 * Custom hook for Google Calendar integration
 * Manages calendar event fetching and synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchCalendarEvents,
  formatCalendarEvent,
  searchCalendarEvents,
  isCalendarConfigured
} from '../services/calendarService';

export const useCalendar = (calendarId = 'primary') => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConfigured, setIsConfigured] = useState(false);

  // Check if calendar is configured
  useEffect(() => {
    setIsConfigured(isCalendarConfigured());
  }, []);

  // Fetch calendar events
  const loadEvents = useCallback(async (options = {}) => {
    if (!isConfigured) {
      setError('Google Calendar API not configured');
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      const calendarEvents = await fetchCalendarEvents(calendarId, options);
      const formattedEvents = calendarEvents.map(formatCalendarEvent);
      
      setEvents(formattedEvents);
      return formattedEvents;
    } catch (err) {
      setError(err.message);
      console.error('Error loading calendar events:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [calendarId, isConfigured]);

  // Search calendar events
  const searchEvents = useCallback(async (query) => {
    if (!isConfigured || !query) {
      return [];
    }

    try {
      setLoading(true);
      setError(null);
      
      const results = await searchCalendarEvents(query, calendarId);
      setEvents(results);
      return results;
    } catch (err) {
      setError(err.message);
      console.error('Error searching calendar:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [calendarId, isConfigured]);

  // Filter events by date range
  const filterByDateRange = useCallback((startDate, endDate) => {
    return events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      return eventStart >= startDate && eventEnd <= endDate;
    });
  }, [events]);

  // Filter events by location
  const filterByLocation = useCallback((location) => {
    return events.filter(event =>
      event.location?.toLowerCase().includes(location.toLowerCase())
    );
  }, [events]);

  // Sort events by date
  const sortByDate = useCallback((order = 'asc') => {
    const sorted = [...events].sort((a, b) => {
      const dateA = new Date(a.start);
      const dateB = new Date(b.start);
      return order === 'asc' ? dateA - dateB : dateB - dateA;
    });
    return sorted;
  }, [events]);

  return {
    events,
    loading,
    error,
    isConfigured,
    loadEvents,
    searchEvents,
    filterByDateRange,
    filterByLocation,
    sortByDate,
    eventCount: events.length
  };
};

export default useCalendar;
