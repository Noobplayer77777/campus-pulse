import React, { createContext, useReducer, useCallback, useEffect } from 'react';
import * as eventsService from '../services/eventsService';
import * as registrationsService from '../services/registrationsService';
import * as clubsService from '../services/clubsService';
import * as locationsService from '../services/locationsService';

export const EventsContext = createContext();

const initialState = {
  events: [],
  registrations: [],
  clubs: [],
  locations: [],
  loading: false,
  error: null,
  filters: {
    location: null,
    dateRange: 'future',
    type: null,
    club: null,
  },
};

function eventsReducer(state, action) {
  switch (action.type) {
    case 'SET_EVENTS':
      return {
        ...state,
        events: action.payload,
      };
    case 'SET_REGISTRATIONS':
      return {
        ...state,
        registrations: action.payload,
      };
    case 'SET_CLUBS':
      return {
        ...state,
        clubs: action.payload,
      };
    case 'SET_LOCATIONS':
      return {
        ...state,
        locations: action.payload,
      };
    case 'ADD_EVENT':
      return {
        ...state,
        events: [...state.events, action.payload],
      };
    case 'UPDATE_EVENT':
      return {
        ...state,
        events: state.events.map((event) =>
          event.eventId === action.payload.eventId ? action.payload : event
        ),
      };
    case 'UPDATE_EVENT_CAPACITY':
      return {
        ...state,
        events: state.events.map((event) =>
          event.eventId === action.payload.eventId
            ? { ...event, registeredCount: action.payload.registeredCount }
            : event
        ),
      };
    case 'REMOVE_EVENT':
      return {
        ...state,
        events: state.events.filter((event) => event.eventId !== action.payload),
      };
    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

export function EventsProvider({ children }) {
  const [state, dispatch] = useReducer(eventsReducer, initialState);

  // Fetch all events with filters
  const fetchEvents = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const memoFilters = {
        ...state.filters,
        ...filters,
      };
      const events = await eventsService.getEvents(memoFilters);
      dispatch({ type: 'SET_EVENTS', payload: events });
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      console.error('Error fetching events:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters]);

  // Create event
  const createEvent = useCallback(async (eventData) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await eventsService.createEvent(eventData);
      dispatch({ type: 'CLEAR_ERROR' });
      // Refresh events list after creating a new event
      const events = await eventsService.getEvents(state.filters);
      dispatch({ type: 'SET_EVENTS', payload: events });
      return result;
    } catch (error) {
      console.error('Error creating event:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters]);

  // Fetch user's registrations
  const fetchUserRegistrations = useCallback(async (userId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const registrations = await registrationsService.getUserRegistrations(userId);
      dispatch({ type: 'SET_REGISTRATIONS', payload: registrations });
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      console.error('Error fetching registrations:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Register for event
  const registerForEvent = useCallback(async (userId, eventId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await registrationsService.registerForEvent(userId, eventId);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      console.error('Error registering for event:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Cancel registration
  const cancelRegistration = useCallback(async (userId, eventId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await registrationsService.cancelRegistration(userId, eventId);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      console.error('Error cancelling registration:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Leave queue
  const leaveQueue = useCallback(async (userId, eventId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await registrationsService.leaveQueue(userId, eventId);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      console.error('Error leaving queue:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Update event capacity count
  const updateEventCapacity = useCallback((eventId, newCapacityCount) => {
    dispatch({
      type: 'UPDATE_EVENT_CAPACITY',
      payload: {
        eventId,
        registeredCount: newCapacityCount,
      },
    });
  }, []);

  // Fetch all clubs
  const fetchClubs = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const clubs = await clubsService.getClubs(filters);
      dispatch({ type: 'SET_CLUBS', payload: clubs });
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      console.error('Error fetching clubs:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Create club (Admin only)
  const createClub = useCallback(async (clubData, adminId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await clubsService.createClub(clubData, adminId);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      console.error('Error creating club:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Fetch all locations
  const fetchLocations = useCallback(async (filters = {}) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const locations = await locationsService.getLocations(filters);
      dispatch({ type: 'SET_LOCATIONS', payload: locations });
      dispatch({ type: 'CLEAR_ERROR' });
    } catch (error) {
      console.error('Error fetching locations:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Create location (Admin only)
  const createLocation = useCallback(async (locationData, adminId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const result = await locationsService.createLocation(locationData, adminId);
      dispatch({ type: 'CLEAR_ERROR' });
      return result;
    } catch (error) {
      console.error('Error creating location:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Approve event (Admin only)
  const approveEvent = useCallback(async (eventId, adminId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await eventsService.approveEvent(eventId, adminId);
      dispatch({ type: 'CLEAR_ERROR' });
      // Refresh events
      const events = await eventsService.getEvents(state.filters);
      dispatch({ type: 'SET_EVENTS', payload: events });
    } catch (error) {
      console.error('Error approving event:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters]);

  // Reject event (Admin only)
  const rejectEvent = useCallback(async (eventId, adminId, reason) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await eventsService.rejectEvent(eventId, adminId, reason);
      dispatch({ type: 'CLEAR_ERROR' });
      // Refresh events
      const events = await eventsService.getEvents(state.filters);
      dispatch({ type: 'SET_EVENTS', payload: events });
    } catch (error) {
      console.error('Error rejecting event:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters]);

  // Cancel event (Admin only)
  const cancelEvent = useCallback(async (eventId, adminId, reason) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await eventsService.cancelEvent(eventId, adminId, reason);
      dispatch({ type: 'CLEAR_ERROR' });
      // Refresh events
      const events = await eventsService.getEvents(state.filters);
      dispatch({ type: 'SET_EVENTS', payload: events });
    } catch (error) {
      console.error('Error cancelling event:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.filters]);

  // Request event cancellation (Club only)
  const requestEventCancellation = useCallback(async (eventId, clubId, reason) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await eventsService.requestCancellation(eventId, clubId, reason);
      dispatch({ type: 'CLEAR_ERROR' });
      return { status: 'success', message: 'Cancellation request sent' };
    } catch (error) {
      console.error('Error requesting cancellation:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Delete an event (Club can only delete pending events)
  const deleteEvent = useCallback(async (eventId) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await eventsService.deleteEvent(eventId);
      // Fetch all events with only date range filter to ensure UI updates
      const allEvents = await eventsService.getEvents({ dateRange: 'future' });
      dispatch({ type: 'SET_EVENTS', payload: allEvents });
      dispatch({ type: 'CLEAR_ERROR' });
      return { status: 'success', message: 'Event deleted successfully' };
    } catch (error) {
      console.error('Error deleting event:', error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // Initialize: Fetch events on component mount
  useEffect(() => {
    fetchEvents({ dateRange: 'future' });
  }, [fetchEvents]);

  const value = {
    ...state,
    dispatch,
    fetchEvents,
    createEvent,
    fetchUserRegistrations,
    registerForEvent,
    cancelRegistration,
    leaveQueue,
    updateEventCapacity,
    fetchClubs,
    createClub,
    fetchLocations,
    createLocation,
    approveEvent,
    rejectEvent,
    cancelEvent,
    requestEventCancellation,
    deleteEvent,
  };

  return (
    <EventsContext.Provider value={value}>{children}</EventsContext.Provider>
  );
}
