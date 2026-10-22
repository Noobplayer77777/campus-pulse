/**
 * AWS Lambda Main Entry Point for Campus Pulse API
 * Handles Amazon API Gateway HTTP API v2 events, Amazon Cognito JWT claims,
 * and scheduled Amazon EventBridge events.
 */

const { ROLES } = require('./config/constants');
const { success, error, corsOptions } = require('./utils/response');
const { extractCaller, requireAuth, requireRole } = require('./middleware/auth');
const logger = require('./middleware/logger');

const eventsService = require('./services/eventsService');
const registrationService = require('./services/registrationService');
const usersService = require('./services/usersService');
const clubsService = require('./services/clubsService');
const locationsService = require('./services/locationsService');
const cleanupService = require('./services/cleanupService');

/**
 * Safely parse incoming JSON body from API Gateway HTTP API v2.
 */
function parseBody(event) {
  if (!event.body) return {};
  if (typeof event.body === 'object') return event.body;
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;
    return JSON.parse(raw);
  } catch (err) {
    return null; // Signals malformed JSON
  }
}

/**
 * Main Lambda Handler
 */
exports.handler = async (event, context) => {
  // 1. Handle EventBridge Scheduled Events (e.g. nightly cleanup)
  if (event.source === 'aws.events' || event['detail-type'] === 'Scheduled Event') {
    logger.info('Scheduled EventBridge cleanup triggered');
    try {
      const result = await cleanupService.cleanupExpiredEvents();
      return { statusCode: 200, body: JSON.stringify(result) };
    } catch (err) {
      logger.error('Scheduled cleanup failed', { error: err.message });
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // 2. Extract HTTP method and path
  const method = (event.requestContext?.http?.method || event.httpMethod || 'GET').toUpperCase();
  const path = event.rawPath || event.path || '/';

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return corsOptions();
  }

  // 3. Extract Caller Identity from verified Cognito claims
  const caller = extractCaller(event);
  const query = event.queryStringParameters || {};

  // Parse Body
  let body = {};
  if (['POST', 'PUT', 'PATCH'].includes(method) && event.body) {
    body = parseBody(event);
    if (body === null) {
      return error('Invalid JSON payload in request body', 400, 'BAD_REQUEST');
    }
  }

  logger.info('API Gateway Request', {
    method,
    path,
    callerId: caller.userId,
    callerRole: caller.role,
  });

  try {
    // -------------------------------------------------------------------------
    // Route: /api/events
    // -------------------------------------------------------------------------
    if (path === '/api/events' || path === '/api/events/') {
      if (method === 'GET') {
        const events = await eventsService.listEvents(query, caller);
        return success({ events });
      }

      if (method === 'POST') {
        const roleErr = requireRole(caller, [ROLES.CLUB, ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const newEvent = await eventsService.createEvent(body, caller);
        return success({ message: 'Event submitted successfully', event: newEvent }, 201);
      }
    }

    // -------------------------------------------------------------------------
    // Route: /api/events/{eventId} (and nested action subroutes)
    // -------------------------------------------------------------------------
    const eventActionMatch = path.match(/^\/api\/events\/([a-zA-Z0-9_-]+)(?:\/([a-zA-Z0-9_-]+))?$/);
    if (eventActionMatch) {
      const eventId = eventActionMatch[1];
      const action = eventActionMatch[2]; // e.g., 'approve', 'reject', 'register', 'cancel', 'leave-queue'

      if (!action) {
        if (method === 'GET') {
          const evt = await eventsService.getEventById(eventId);
          if (!evt) {
            return error('Event not found', 404, 'NOT_FOUND');
          }
          return success({ event: evt });
        }

        if (method === 'PUT') {
          const roleErr = requireRole(caller, [ROLES.CLUB, ROLES.ADMIN]);
          if (roleErr) return roleErr;

          const result = await eventsService.updateEvent(eventId, body, caller);
          return success(result);
        }

        if (method === 'DELETE') {
          const roleErr = requireRole(caller, [ROLES.CLUB, ROLES.ADMIN]);
          if (roleErr) return roleErr;

          const result = await eventsService.deleteEvent(eventId, caller);
          return success(result);
        }
      }

      // Actions on /api/events/{eventId}/{action}
      if (action === 'approve' && method === 'PUT') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const result = await eventsService.approveEvent(eventId, caller);
        return success(result);
      }

      if (action === 'reject' && method === 'PUT') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const result = await eventsService.rejectEvent(eventId, body.reason || '', caller);
        return success(result);
      }

      if (action === 'register' && method === 'POST') {
        const authErr = requireAuth(caller);
        if (authErr) return authErr;

        // Ensure caller identity is derived strictly from verified JWT claims
        const userData = {
          ...body,
          userId: caller.userId,
          email: caller.email,
          name: caller.displayName,
          regNo: body.regNo || '',
        };

        const result = await registrationService.registerForEvent(eventId, caller.userId, userData);
        return success(result, 201);
      }

      if (action === 'cancel' && method === 'POST') {
        const authErr = requireAuth(caller);
        if (authErr) return authErr;

        const result = await registrationService.cancelRegistration(eventId, caller.userId);
        return success(result);
      }

      if (action === 'leave-queue' && method === 'POST') {
        const authErr = requireAuth(caller);
        if (authErr) return authErr;

        const result = await registrationService.leaveQueue(eventId, caller.userId);
        return success(result);
      }

      if (action === 'feedback' && method === 'POST') {
        const authErr = requireAuth(caller);
        if (authErr) return authErr;

        const { rating, feedback } = body;
        const result = await registrationService.submitAttendanceRating(
          eventId,
          caller.userId,
          rating,
          feedback
        );
        return success(result);
      }
    }

    // -------------------------------------------------------------------------
    // Route: /api/users/me & /api/users/me/registrations
    // -------------------------------------------------------------------------
    if (path === '/api/users/me' || path === '/api/users/me/') {
      const authErr = requireAuth(caller);
      if (authErr) return authErr;

      if (method === 'GET') {
        let user = await usersService.getUser(caller.userId);
        if (!user) {
          // Provision initial user record synced with verified Cognito token
          user = await usersService.createUser({
            userId: caller.userId,
            email: caller.email,
            displayName: caller.displayName,
            role: caller.role,
          });
        }
        return success({ user });
      }

      if (method === 'PUT') {
        const updated = await usersService.updateUserProfile(caller.userId, body);
        return success({ message: 'Profile updated successfully', user: updated });
      }
    }

    if (path === '/api/users/me/registrations' || path === '/api/users/me/registrations/') {
      const authErr = requireAuth(caller);
      if (authErr) return authErr;

      if (method === 'GET') {
        const registrations = await registrationService.getUserRegistrations(caller.userId);
        return success({ registrations });
      }
    }

    // -------------------------------------------------------------------------
    // Route: /api/clubs
    // -------------------------------------------------------------------------
    if (path === '/api/clubs' || path === '/api/clubs/') {
      if (method === 'GET') {
        const clubs = await clubsService.listClubs(query);
        return success({ clubs });
      }

      if (method === 'POST') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const newClub = await clubsService.createClub(body, caller.userId);
        return success({ message: 'Club created successfully', club: newClub }, 201);
      }
    }

    const clubMatch = path.match(/^\/api\/clubs\/([a-zA-Z0-9_-]+)$/);
    if (clubMatch) {
      const clubId = clubMatch[1];
      if (method === 'GET') {
        const club = await clubsService.getClubById(clubId);
        if (!club) return error('Club not found', 404, 'NOT_FOUND');
        return success({ club });
      }

      if (method === 'PUT') {
        const roleErr = requireRole(caller, [ROLES.CLUB, ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const updated = await clubsService.updateClub(clubId, body, caller);
        return success({ message: 'Club updated successfully', club: updated });
      }
    }

    // -------------------------------------------------------------------------
    // Route: /api/locations
    // -------------------------------------------------------------------------
    if (path === '/api/locations' || path === '/api/locations/') {
      if (method === 'GET') {
        const filters = {
          activeOnly: query.activeOnly !== 'false',
          campus: query.campus,
        };
        const locations = await locationsService.listLocations(filters);
        return success({ locations });
      }

      if (method === 'POST') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const newLocation = await locationsService.createLocation(body, caller.userId);
        return success(newLocation, 201);
      }
    }

    const locMatch = path.match(/^\/api\/locations\/([a-zA-Z0-9_-]+)$/);
    if (locMatch) {
      const locationId = locMatch[1];
      if (method === 'GET') {
        const location = await locationsService.getLocationById(locationId);
        if (!location) return error('Location not found', 404, 'NOT_FOUND');
        return success({ location });
      }

      if (method === 'PUT') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const updated = await locationsService.updateLocation(locationId, body);
        return success({ message: 'Location updated successfully', location: updated });
      }

      if (method === 'DELETE') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const result = await locationsService.deleteLocation(locationId);
        return success(result);
      }
    }

    // -------------------------------------------------------------------------
    // Route: /api/admin/cleanup-expired
    // -------------------------------------------------------------------------
    if (path === '/api/admin/cleanup-expired' || path === '/api/admin/cleanup-expired/') {
      if (method === 'POST') {
        const roleErr = requireRole(caller, [ROLES.ADMIN]);
        if (roleErr) return roleErr;

        const result = await cleanupService.cleanupExpiredEvents();
        return success(result);
      }
    }

    // Catch-all 404
    logger.warn('Route not found', { method, path });
    return error(`Cannot ${method} ${path}`, 404, 'NOT_FOUND');
  } catch (err) {
    logger.error('Unhandled API Gateway Error', {
      method,
      path,
      errorName: err.name,
      errorMessage: err.message,
    });

    const statusCode = err.statusCode || (err.name === 'ConditionalCheckFailedException' ? 409 : 500);
    return error(err.message || 'Internal server error', statusCode);
  }
};
