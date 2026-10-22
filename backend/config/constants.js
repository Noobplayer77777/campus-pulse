/**
 * System configuration and constants
 * Reads table names and AWS region from environment variables.
 */

const CONFIG = {
  REGION: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  TABLES: {
    USERS: process.env.USERS_TABLE || 'CampusPulse-Users',
    EVENTS: process.env.EVENTS_TABLE || 'CampusPulse-Events',
    REGISTRATIONS: process.env.REGISTRATIONS_TABLE || 'CampusPulse-Registrations',
    CLUBS: process.env.CLUBS_TABLE || 'CampusPulse-Clubs',
    LOCATIONS: process.env.LOCATIONS_TABLE || 'CampusPulse-Locations',
  },
  INDEXES: {
    EVENTS_STATUS_DATE: 'GSI_StatusDate',
    EVENTS_CLUB_DATE: 'GSI_ClubEvents',
    REGISTRATIONS_USER: 'GSI_UserRegistrations',
    REGISTRATIONS_WAITLIST: 'GSI_Waitlist',
  },
};

const ROLES = {
  STUDENT: 'student',
  CLUB: 'club',
  ADMIN: 'admin',
};

const EVENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

const REGISTRATION_STATUS = {
  REGISTERED: 'registered',
  QUEUED: 'queued',
  ATTENDED: 'attended',
};

const DIFFICULTY_LEVELS = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
};

module.exports = {
  CONFIG,
  ROLES,
  EVENT_STATUS,
  REGISTRATION_STATUS,
  DIFFICULTY_LEVELS,
};
