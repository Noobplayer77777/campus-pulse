/**
 * Unit Tests for AWS Service Adapters
 * Validates request mapping, response normalization, and business constraints
 * across events, registrations, clubs, locations, and cleanup services.
 */

import apiClient from '../services/apiClient';
import * as eventsService from '../services/eventsService';
import * as registrationsService from '../services/registrationsService';
import * as clubsService from '../services/clubsService';
import * as locationsService from '../services/locationsService';
import * as expiredEventsService from '../services/expiredEventsService';

// Mock apiClient calls
jest.mock('../services/apiClient', () => {
  return {
    __esModule: true,
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      rawInstance: {
        interceptors: {
          request: { handlers: [{ fulfilled: jest.fn() }] },
          response: { handlers: [{ fulfilled: jest.fn(), rejected: jest.fn() }] },
        },
      },
    },
    apiClient: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    },
    setAuthTokenProvider: jest.fn(),
    setMockHeadersProvider: jest.fn(),
    setSessionExpiredHandler: jest.fn(),
  };
});

describe('AWS Service Adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('eventsService', () => {
    test('getEvents queries /api/events with filters and normalizes numeric values', async () => {
      apiClient.get.mockResolvedValueOnce({
        events: [
          {
            eventId: 'evt-1',
            name: 'Hackathon',
            capacity: '100',
            registeredCount: '45',
            waitlistCount: '5',
          },
        ],
      });

      const events = await eventsService.getEvents({ location: 'hall-a', dateRange: 'future' });

      expect(apiClient.get).toHaveBeenCalledWith('/api/events', {
        params: { location: 'hall-a', dateRange: 'future' },
      });
      expect(events[0].capacity).toBe(100);
      expect(events[0].registeredCount).toBe(45);
      expect(events[0].waitlistCount).toBe(5);
    });

    test('createEvent enforces 24-hour lead time requirement', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await expect(
        eventsService.createEvent({
          name: 'Late Event',
          type: 'solo',
          location: 'hall-a',
          date: yesterday,
          time: '10:00',
          endTime: '12:00',
          clubId: 'club-1',
        })
      ).rejects.toThrow('Event must be scheduled at least 24 hours in advance');
    });

    test('approveEvent calls PUT /api/events/{id}/approve', async () => {
      apiClient.put.mockResolvedValueOnce({ message: 'Event approved successfully' });

      const res = await eventsService.approveEvent('evt-10', 'admin-1');
      expect(apiClient.put).toHaveBeenCalledWith('/api/events/evt-10/approve');
      expect(res.status).toBe('success');
    });

    test('rejectEvent calls PUT /api/events/{id}/reject with reason', async () => {
      apiClient.put.mockResolvedValueOnce({ message: 'Event rejected successfully' });

      const res = await eventsService.rejectEvent('evt-10', 'admin-1', 'Location unavailable');
      expect(apiClient.put).toHaveBeenCalledWith('/api/events/evt-10/reject', {
        reason: 'Location unavailable',
      });
      expect(res.status).toBe('success');
    });

    test('deleteEvent calls DELETE /api/events/{id}', async () => {
      apiClient.delete.mockResolvedValueOnce({ message: 'Event deleted' });

      const res = await eventsService.deleteEvent('evt-10');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/events/evt-10');
      expect(res.status).toBe('success');
    });

    test('updateEvent calls PUT /api/events/{id}', async () => {
      apiClient.put.mockResolvedValueOnce({ message: 'Event updated successfully' });

      const res = await eventsService.updateEvent('evt-10', { description: 'Updated info' });
      expect(apiClient.put).toHaveBeenCalledWith('/api/events/evt-10', { description: 'Updated info' });
      expect(res.status).toBe('success');
    });
  });

  describe('registrationsService', () => {
    test('registerForEvent calls POST /api/events/{id}/register', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: 'registered',
        message: 'Registered successfully',
      });

      const res = await registrationsService.registerForEvent('student-1', 'evt-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/events/evt-1/register', {});
      expect(res.status).toBe('registered');
    });

    test('registerForEvent handles 409 conflict gracefully as already_registered', async () => {
      const conflictError = new Error('Already registered or waitlisted for this event');
      conflictError.statusCode = 409;
      apiClient.post.mockRejectedValueOnce(conflictError);

      const res = await registrationsService.registerForEvent('student-1', 'evt-1');
      expect(res.status).toBe('already_registered');
      expect(res.message).toContain('already registered');
    });

    test('cancelRegistration calls POST /api/events/{id}/cancel and passes promotion status', async () => {
      apiClient.post.mockResolvedValueOnce({
        status: 'cancelled',
        message: 'Unregistered. Next person in queue promoted',
        promoted: true,
      });

      const res = await registrationsService.cancelRegistration('student-1', 'evt-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/events/evt-1/cancel', {});
      expect(res.promoted).toBe(true);
    });

    test('leaveQueue calls POST /api/events/{id}/leave-queue', async () => {
      apiClient.post.mockResolvedValueOnce({ status: 'success', message: 'Left the queue' });

      const res = await registrationsService.leaveQueue('student-1', 'evt-1');
      expect(apiClient.post).toHaveBeenCalledWith('/api/events/evt-1/leave-queue', {});
      expect(res.status).toBe('success');
    });

    test('getUserRegistrations calls GET /api/users/me/registrations', async () => {
      apiClient.get.mockResolvedValueOnce({
        registrations: [{ eventId: 'evt-1', status: 'registered' }],
      });

      const list = await registrationsService.getUserRegistrations('student-1');
      expect(apiClient.get).toHaveBeenCalledWith('/api/users/me/registrations');
      expect(list.length).toBe(1);
    });

    test('submitAttendanceRating calls POST /api/events/{id}/feedback', async () => {
      apiClient.post.mockResolvedValueOnce({
        message: 'Thank you for your feedback',
        registration: { status: 'attended', rating: 5 },
      });

      const res = await registrationsService.submitAttendanceRating('student-1', 'evt-1', 5, 'Great session');
      expect(apiClient.post).toHaveBeenCalledWith('/api/events/evt-1/feedback', {
        rating: 5,
        feedback: 'Great session',
      });
      expect(res.status).toBe('success');
    });

    test('submitAttendanceRating validates rating range 1-5', async () => {
      await expect(
        registrationsService.submitAttendanceRating('student-1', 'evt-1', 99, 'Bad rating')
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('clubsService', () => {
    test('getClubs calls GET /api/clubs', async () => {
      apiClient.get.mockResolvedValueOnce({ clubs: [{ clubId: 'club-1', name: 'Robotics' }] });

      const clubs = await clubsService.getClubs();
      expect(apiClient.get).toHaveBeenCalledWith('/api/clubs', { params: {} });
      expect(clubs.length).toBe(1);
    });

    test('createClub calls POST /api/clubs', async () => {
      apiClient.post.mockResolvedValueOnce({
        club: { clubId: 'club-2', name: 'AI Society' },
        message: 'Club created',
      });

      const res = await clubsService.createClub(
        {
          name: 'AI Society',
          faculty: 'Dr. Turing',
          facultyEmail: 'turing@college.edu',
          presidentId: 'student-2',
        },
        'admin-1'
      );

      expect(apiClient.post).toHaveBeenCalledWith('/api/clubs', expect.any(Object));
      expect(res.clubId).toBe('club-2');
    });

    test('updateClub calls PUT /api/clubs/{id}', async () => {
      apiClient.put.mockResolvedValueOnce({ message: 'Club updated successfully' });

      const res = await clubsService.updateClub('club-1', { description: 'Updated Club Info' });
      expect(apiClient.put).toHaveBeenCalledWith('/api/clubs/club-1', { description: 'Updated Club Info' });
      expect(res.status).toBe('success');
    });
  });

  describe('locationsService', () => {
    test('getLocations calls GET /api/locations', async () => {
      apiClient.get.mockResolvedValueOnce({
        locations: [{ locationId: 'auditorium-1', name: 'Main Auditorium' }],
      });

      const locations = await locationsService.getLocations();
      expect(apiClient.get).toHaveBeenCalledWith('/api/locations', { params: {} });
      expect(locations.length).toBe(1);
    });

    test('updateLocation calls PUT /api/locations/{id}', async () => {
      apiClient.put.mockResolvedValueOnce({ message: 'Location updated successfully' });

      const res = await locationsService.updateLocation('auditorium-1', { capacity: 500 });
      expect(apiClient.put).toHaveBeenCalledWith('/api/locations/auditorium-1', { capacity: 500 });
      expect(res.status).toBe('success');
    });

    test('deleteLocation calls DELETE /api/locations/{id}', async () => {
      apiClient.delete.mockResolvedValueOnce({});

      const res = await locationsService.deleteLocation('auditorium-1');
      expect(apiClient.delete).toHaveBeenCalledWith('/api/locations/auditorium-1');
      expect(res.status).toBe('success');
    });
  });

  describe('expiredEventsService', () => {
    test('deleteExpiredEvents calls POST /api/admin/cleanup-expired', async () => {
      apiClient.post.mockResolvedValueOnce({
        deletedCount: 3,
        errors: [],
        eventIds: ['evt-old-1', 'evt-old-2', 'evt-old-3'],
      });

      const res = await expiredEventsService.deleteExpiredEvents();
      expect(apiClient.post).toHaveBeenCalledWith('/api/admin/cleanup-expired', {});
      expect(res.deletedCount).toBe(3);
    });

    test('isEventExpired identifies past dates correctly', () => {
      expect(expiredEventsService.isEventExpired('2020-01-01')).toBe(true);
      expect(expiredEventsService.isEventExpired('2099-12-31')).toBe(false);
    });
  });
});
