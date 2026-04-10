// User roles
export const ROLES = {
  STUDENT: 'student',
  CLUB: 'club',
  ADMIN: 'admin',
};

// Event types
export const EVENT_TYPES = {
  SOLO: 'solo',
  TEAM: 'team',
};

// Event status
export const EVENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
};

// Approval status
export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

// Approval types
export const APPROVAL_TYPES = {
  CREATION: 'creation',
  CANCELLATION: 'cancellation',
};

// Notification types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  INFO: 'info',
  WARNING: 'warning',
};

// Firestore collections
export const COLLECTIONS = {
  USERS: 'users',
  CLUBS: 'clubs',
  EVENTS: 'events',
  REGISTRATIONS: 'registrations',
  LOCATIONS: 'locations',
  APPROVALS: 'eventApprovals',
};

// Routes
export const ROUTES = {
  AUTH: '/auth',
  HOME: '/home',
  STUDENT_DASHBOARD: '/student-dashboard',
  CLUB_DASHBOARD: '/club-dashboard',
  ADMIN_DASHBOARD: '/admin-dashboard',
};

// API endpoints (for later use with AI features)
export const API_ENDPOINTS = {
  CHATBOT: '/api/chatbot',
  RECOMMENDATIONS: '/api/recommendations',
};
