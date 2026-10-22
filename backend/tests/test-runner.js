/**
 * Campus Pulse Backend Automated Test Runner
 * Validates RBAC authorization, atomic capacity limits, waitlist monotonicity,
 * queue promotion, and API Gateway route integration.
 * Zero external dependencies: runs with standard Node.js.
 */

// 1. Intercept AWS SDK module loading for offline/local environment if not installed
const Module = require('module');
const originalRequire = Module.prototype.require;

class MockAwsCommand {
  constructor(input) {
    this.input = input;
  }
}

Module.prototype.require = function (modulePath) {
  if (modulePath === '@aws-sdk/lib-dynamodb') {
    return {
      GetCommand: class GetCommand extends MockAwsCommand {},
      PutCommand: class PutCommand extends MockAwsCommand {},
      UpdateCommand: class UpdateCommand extends MockAwsCommand {},
      DeleteCommand: class DeleteCommand extends MockAwsCommand {},
      QueryCommand: class QueryCommand extends MockAwsCommand {},
      ScanCommand: class ScanCommand extends MockAwsCommand {},
      TransactWriteCommand: class TransactWriteCommand extends MockAwsCommand {},
      DynamoDBDocumentClient: { from: () => ({ send: () => {} }) },
    };
  }
  if (modulePath === '@aws-sdk/client-dynamodb') {
    return { DynamoDBClient: class DynamoDBClient {} };
  }
  return originalRequire.apply(this, arguments);
};

// 2. Set test environment variables before requiring configuration
process.env.NODE_ENV = 'test';
process.env.USERS_TABLE = 'CampusPulse-Users-Test';
process.env.EVENTS_TABLE = 'CampusPulse-Events-Test';
process.env.REGISTRATIONS_TABLE = 'CampusPulse-Registrations-Test';
process.env.CLUBS_TABLE = 'CampusPulse-Clubs-Test';
process.env.LOCATIONS_TABLE = 'CampusPulse-Locations-Test';
process.env.AWS_REGION = 'us-east-1';

const { MockDynamoClient } = require('./mockDynamo');
const { setDocClient } = require('../db/dynamoClient');
const { CONFIG, ROLES, EVENT_STATUS, REGISTRATION_STATUS } = require('../config/constants');

const eventsService = require('../services/eventsService');
const registrationService = require('../services/registrationService');
const usersService = require('../services/usersService');
const clubsService = require('../services/clubsService');
const locationsService = require('../services/locationsService');
const cleanupService = require('../services/cleanupService');
const { handler } = require('../index');

// 3. Test assertions and harness
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  [PASS] ${message} (Expected: ${expected}, Got: ${actual})`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${message} (Expected: ${expected}, Got: ${actual})`);
  }
}

// 4. Run test suites
async function runAllTests() {
  console.log('\n======================================================');
  console.log('       CAMPUS PULSE AWS BACKEND TEST SUITE            ');
  console.log('======================================================\n');

  const mockDb = new MockDynamoClient();
  setDocClient(mockDb);

  // -----------------------------------------------------------------
  // SUITE 1: RBAC & Authorization Safeguards
  // -----------------------------------------------------------------
  console.log('--- SUITE 1: Role-Based Access Control (RBAC) ---');
  mockDb.reset();

  // Test 1.1: Public user creation cannot escalate role to admin
  const user1 = await usersService.createUser({
    userId: 'user-student-1',
    email: 'hacker@college.edu',
    displayName: 'Clever Student',
    role: 'admin', // Malicious attempt to self-assign admin
  });
  assertEqual(user1.role, ROLES.STUDENT, 'Public signup forces student role regardless of input');

  // Test 1.2: Profile update cannot overwrite role
  const updatedUser = await usersService.updateUserProfile('user-student-1', {
    displayName: 'Legit Student',
    role: 'admin', // Attempted role overwrite
  });
  assertEqual(updatedUser.role, ROLES.STUDENT, 'Profile update ignores role parameter');
  assertEqual(updatedUser.displayName, 'Legit Student', 'Profile update modified displayName correctly');

  // Test 1.3: Event Creation Authorization
  const studentCaller = { userId: 'user-student-1', email: 'stu@college.edu', role: ROLES.STUDENT, isAuthenticated: true };
  const clubCaller = { userId: 'club-pres-1', email: 'robotics@college.edu', role: ROLES.CLUB, isAuthenticated: true };
  const adminCaller = { userId: 'admin-1', email: 'admin@college.edu', role: ROLES.ADMIN, isAuthenticated: true };

  // Future date for scheduling validation (1 week ahead)
  const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const validEventData = {
    title: 'Robotics Workshop',
    description: 'Autonomous line-follower build',
    date: futureDate,
    startTime: '14:00',
    endTime: '17:00',
    location: 'Engineering Lab 101',
    clubId: 'club-robotics',
    capacity: 2, // Low capacity for testing waitlist
  };

  // Student attempts to create event directly through service -> should reject
  let studentCreateFailed = false;
  try {
    await eventsService.createEvent(validEventData, studentCaller);
  } catch (err) {
    studentCreateFailed = true;
  }
  assert(studentCreateFailed, 'Student caller is rejected when creating an event');

  // Club user creates event -> pending status
  const createdEvent = await eventsService.createEvent(validEventData, clubCaller);
  assertEqual(createdEvent.status, EVENT_STATUS.PENDING, 'Club event is created with status PENDING');
  assertEqual(createdEvent.capacity, 2, 'Event capacity stored correctly');
  assertEqual(createdEvent.registeredCount, 0, 'Initial registeredCount is 0');
  assertEqual(createdEvent.waitlistSequence, 0, 'Initial waitlistSequence is 0');

  // Club user tries to approve event -> should reject
  let clubApproveFailed = false;
  try {
    await eventsService.approveEvent(createdEvent.eventId, clubCaller);
  } catch (err) {
    clubApproveFailed = true;
  }
  assert(clubApproveFailed, 'Club caller cannot approve their own event (Admin required)');

  // Admin approves event
  const approvedEvent = await eventsService.approveEvent(createdEvent.eventId, adminCaller);
  assertEqual(approvedEvent.status, EVENT_STATUS.APPROVED, 'Admin successfully approves event');

  // -----------------------------------------------------------------
  // SUITE 2: Capacity Enforcement & Overbooking Prevention
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 2: Atomic Capacity & Waitlist Queuing ---');

  const eventId = approvedEvent.eventId;

  // Student 1 registers -> Seat 1 (registered)
  const reg1 = await registrationService.registerForEvent(eventId, 'stu-1', {
    name: 'Alice Student',
    email: 'alice@college.edu',
  });
  assertEqual(reg1.status, 'registered', 'Student 1 receives confirmed registered seat');
  assertEqual(reg1.isWaitlisted, false, 'Student 1 is not waitlisted');

  // Check event registeredCount
  let evtCheck = await eventsService.getEventById(eventId);
  assertEqual(evtCheck.registeredCount, 1, 'Event registeredCount incremented to 1');

  // Student 1 attempts duplicate registration -> Should throw duplicate error
  let duplicateRejected = false;
  try {
    await registrationService.registerForEvent(eventId, 'stu-1', {
      name: 'Alice Duplicate',
      email: 'alice@college.edu',
    });
  } catch (err) {
    duplicateRejected = err.message.includes('Already registered');
  }
  assert(duplicateRejected, 'Duplicate registration attempt is rejected with clear error');

  // Student 2 registers -> Seat 2 (event capacity = 2 reached!)
  const reg2 = await registrationService.registerForEvent(eventId, 'stu-2', {
    name: 'Bob Student',
    email: 'bob@college.edu',
  });
  assertEqual(reg2.status, 'registered', 'Student 2 receives confirmed registered seat');

  evtCheck = await eventsService.getEventById(eventId);
  assertEqual(evtCheck.registeredCount, 2, 'Event registeredCount incremented to full capacity (2)');

  // Student 3 registers -> Event is at full capacity! Should be automatically waitlisted
  const reg3 = await registrationService.registerForEvent(eventId, 'stu-3', {
    name: 'Charlie Student',
    email: 'charlie@college.edu',
  });
  assertEqual(reg3.status, 'queued', 'Student 3 is queued on waitlist');
  assertEqual(reg3.isWaitlisted, true, 'Student 3 is marked as waitlisted');
  assertEqual(reg3.queuePosition, 1, 'Student 3 assigned queuePosition #1');

  // Ensure registeredCount DID NOT exceed capacity
  evtCheck = await eventsService.getEventById(eventId);
  assertEqual(evtCheck.registeredCount, 2, 'RegisteredCount remained strictly at 2 (no overbooking)');
  assertEqual(evtCheck.waitlistSequence, 1, 'Waitlist sequence atomically advanced to 1');

  // Student 4 registers -> Should be waitlisted with queuePosition #2
  const reg4 = await registrationService.registerForEvent(eventId, 'stu-4', {
    name: 'Diana Student',
    email: 'diana@college.edu',
  });
  assertEqual(reg4.status, 'queued', 'Student 4 is queued on waitlist');
  assertEqual(reg4.queuePosition, 2, 'Student 4 assigned sequential queuePosition #2');

  // -----------------------------------------------------------------
  // SUITE 3: Fair Queue Promotion & Cancellation
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 3: Fair Queue Promotion & Concurrency ---');

  // Student 1 (active seat) cancels registration
  const cancel1 = await registrationService.cancelRegistration(eventId, 'stu-1');
  assertEqual(cancel1.status, 'success', 'Student 1 cancellation returns status success');
  assertEqual(cancel1.registrationStatus, 'cancelled', 'Student 1 registration marked as cancelled');
  assertEqual(cancel1.promotedUserId, 'stu-3', 'Student 3 (pos 1) was automatically promoted');

  // Verify Student 3 is now registered
  const stu3Reg = await registrationService.getRegistrationStatus(eventId, 'stu-3');
  assertEqual(stu3Reg.status, 'registered', 'Student 3 status updated to registered');
  assertEqual(stu3Reg.queuePosition, undefined, 'Student 3 queuePosition attribute removed');

  // Capacity count must STILL be 2 (Alice freed 1, Charlie took 1)
  evtCheck = await eventsService.getEventById(eventId);
  assertEqual(evtCheck.registeredCount, 2, 'RegisteredCount preserved at 2 after 1:1 seat promotion');

  // Student 4 (still in queue at pos 2) decides to leave queue
  const leaveResult = await registrationService.leaveQueue(eventId, 'stu-4');
  assertEqual(leaveResult.status, 'success', 'Student 4 left waitlist queue');
  assertEqual(leaveResult.registrationStatus, 'cancelled', 'Student 4 marked as cancelled');

  // Student 2 cancels their registration (no queued users left)
  const cancel2 = await registrationService.cancelRegistration(eventId, 'stu-2');
  assertEqual(cancel2.status, 'success', 'Student 2 cancelled successfully');
  assertEqual(cancel2.promotedUserId, null, 'No candidate promoted as queue is empty');

  // Capacity count should now decrement to 1
  evtCheck = await eventsService.getEventById(eventId);
  assertEqual(evtCheck.registeredCount, 1, 'RegisteredCount decremented to 1 when empty queue');

  // -----------------------------------------------------------------
  // SUITE 4: API Gateway HTTP API v2 Router Integration
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 4: API Gateway Router & HTTP Endpoints ---');

  // Test 4.1: CORS OPTIONS preflight
  const corsRes = await handler({
    rawPath: '/api/events',
    requestContext: { http: { method: 'OPTIONS' } },
  });
  assertEqual(corsRes.statusCode, 204, 'CORS preflight returns 204 No Content');

  // Test 4.2: GET /api/events (Public)
  const getEventsRes = await handler({
    rawPath: '/api/events',
    requestContext: { http: { method: 'GET' } },
  });
  assertEqual(getEventsRes.statusCode, 200, 'GET /api/events returns 200 OK');
  const eventsBody = JSON.parse(getEventsRes.body);
  assert(Array.isArray(eventsBody.events), 'GET /api/events returns array of events');

  // Test 4.3: POST /api/events without Auth -> 401
  const unauthCreate = await handler({
    rawPath: '/api/events',
    requestContext: { http: { method: 'POST' } },
    body: JSON.stringify(validEventData),
  });
  assertEqual(unauthCreate.statusCode, 401, 'POST /api/events without auth returns 401 Unauthorized');

  // Test 4.4: POST /api/events with Student Token -> 403 Forbidden
  const studentCreate = await handler({
    rawPath: '/api/events',
    requestContext: {
      http: { method: 'POST' },
      authorizer: { jwt: { claims: { sub: 'stu-99', email: 'stu99@college.edu' } } }, // defaults to student
    },
    body: JSON.stringify(validEventData),
  });
  assertEqual(studentCreate.statusCode, 403, 'POST /api/events with student token returns 403 Forbidden');

  // Test 4.5: GET /api/users/me with Student Token
  const getMeRes = await handler({
    rawPath: '/api/users/me',
    requestContext: {
      http: { method: 'GET' },
      authorizer: { jwt: { claims: { sub: 'stu-1', email: 'alice@college.edu', name: 'Alice Student' } } },
    },
  });
  assertEqual(getMeRes.statusCode, 200, 'GET /api/users/me returns 200 OK');

  // Test 4.6: GET /api/users/me/registrations
  const getMyRegs = await handler({
    rawPath: '/api/users/me/registrations',
    requestContext: {
      http: { method: 'GET' },
      authorizer: { jwt: { claims: { sub: 'stu-3', email: 'charlie@college.edu' } } },
    },
  });
  assertEqual(getMyRegs.statusCode, 200, 'GET /api/users/me/registrations returns 200 OK');

  // Test 4.7: GET /api/locations
  const getLocsRes = await handler({
    rawPath: '/api/locations',
    requestContext: { http: { method: 'GET' } },
  });
  assertEqual(getLocsRes.statusCode, 200, 'GET /api/locations returns 200 OK');

  // Test 4.8: GET /api/clubs
  const getClubsRes = await handler({
    rawPath: '/api/clubs',
    requestContext: { http: { method: 'GET' } },
  });
  assertEqual(getClubsRes.statusCode, 200, 'GET /api/clubs returns 200 OK');

  // -----------------------------------------------------------------
  // SUITE 5: Expired Events Cleanup Service
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 5: Expired Events Scheduled Cleanup ---');

  // Insert a mock expired event in the past (2025-01-01)
  const expiredEventItem = {
    eventId: 'past-event-1',
    title: 'Old 2025 Seminar',
    date: '2025-01-01',
    status: EVENT_STATUS.APPROVED,
    capacity: 100,
    registeredCount: 1,
  };
  await mockDb.send({
    TableName: process.env.EVENTS_TABLE,
    Item: expiredEventItem,
  });

  // Insert a registration for this past event
  await mockDb.send({
    TableName: process.env.REGISTRATIONS_TABLE,
    Item: {
      eventId: 'past-event-1',
      userId: 'stu-past-user',
      status: 'registered',
    },
  });

  // Trigger cleanup via Admin route
  const cleanupRes = await handler({
    rawPath: '/api/admin/cleanup-expired',
    requestContext: {
      http: { method: 'POST' },
      authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': ['admin'] } } },
    },
  });
  assertEqual(cleanupRes.statusCode, 200, 'POST /api/admin/cleanup-expired returns 200 OK');
  const cleanupBody = JSON.parse(cleanupRes.body);
  assertEqual(cleanupBody.deletedCount, 1, 'Cleanup successfully deleted 1 expired event');

  // Verify expired event is gone
  const verifyDeleted = await eventsService.getEventById('past-event-1');
  assertEqual(verifyDeleted, null, 'Expired event is completely removed from DynamoDB');

  // -----------------------------------------------------------------
  // SUITE 6: Concurrency, Race Conditions & Atomicity Under Load
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 6: Concurrency & Atomicity Under Parallel Load ---');

  // Test 6.1: Parallel registration when exactly 1 seat remains
  // Create an approved event with capacity = 1
  const raceEventDate = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
  const raceEvent = await eventsService.createEvent(
    {
      title: 'Solo Seat Hackathon',
      description: 'Only 1 seat available',
      date: raceEventDate,
      startTime: '10:00',
      endTime: '12:00',
      location: 'Lab A',
      clubId: 'club-robotics',
      capacity: 1,
    },
    clubCaller
  );
  await eventsService.approveEvent(raceEvent.eventId, adminCaller);

  // 5 different students attempt to register simultaneously via Promise.all
  const racePromises = [1, 2, 3, 4, 5].map((i) =>
    registrationService.registerForEvent(raceEvent.eventId, `race-stu-${i}`, {
      name: `Race Student ${i}`,
      email: `racestu${i}@college.edu`,
    })
  );
  const raceResults = await Promise.all(racePromises);

  const registeredWinners = raceResults.filter((r) => r.status === 'registered');
  const queuedWaitlist = raceResults.filter((r) => r.status === 'queued');

  assertEqual(registeredWinners.length, 1, 'Parallel registration: exactly 1 student gets confirmed seat');
  assertEqual(queuedWaitlist.length, 4, 'Parallel registration: exactly 4 students placed on waitlist');

  // Check unique, monotonic queue positions
  const queuePositions = queuedWaitlist.map((r) => r.queuePosition).sort((a, b) => a - b);
  assertEqual(
    JSON.stringify(queuePositions),
    JSON.stringify([1, 2, 3, 4]),
    'Waitlist queue positions are strictly [1, 2, 3, 4] with zero collisions'
  );

  const checkRaceEvt = await eventsService.getEventById(raceEvent.eventId);
  assertEqual(checkRaceEvt.registeredCount, 1, 'Event registeredCount strictly equals 1 (no overbooking)');
  assertEqual(checkRaceEvt.waitlistSequence, 4, 'Event waitlistSequence matches 4 queued entries');

  // Test 6.2: Parallel duplicate clicks by the same student
  // Student clicks "Register" 4 times simultaneously for a new event
  const dupEvent = await eventsService.createEvent(
    {
      title: 'Double Click Seminar',
      description: 'Testing duplicate click race conditions',
      date: raceEventDate,
      startTime: '13:00',
      endTime: '15:00',
      location: 'Auditorium 2',
      clubId: 'club-robotics',
      capacity: 5,
    },
    clubCaller
  );
  await eventsService.approveEvent(dupEvent.eventId, adminCaller);

  const dupClicks = [1, 2, 3, 4].map(() =>
    registrationService.registerForEvent(dupEvent.eventId, 'impatient-student', {
      name: 'Impatient Student',
      email: 'impatient@college.edu',
    })
  );
  const dupResults = await Promise.allSettled(dupClicks);

  const successfulDupes = dupResults.filter((r) => r.status === 'fulfilled');
  const rejectedDupes = dupResults.filter((r) => r.status === 'rejected');

  assertEqual(successfulDupes.length, 1, 'Parallel duplicate clicks: exactly 1 request succeeds');
  assertEqual(rejectedDupes.length, 3, 'Parallel duplicate clicks: exactly 3 requests rejected with 409 Conflict');
  assert(
    rejectedDupes.every((r) => r.reason.statusCode === 409 || r.reason.message.includes('Already registered')),
    'Rejected duplicate clicks returned 409 Conflict'
  );

  // Test 6.3: Parallel cancellations promoting distinct queued students simultaneously
  // Setup: Event with capacity 2, 2 active registered seats, 2 waitlisted users
  const cancelRaceEvt = await eventsService.createEvent(
    {
      title: 'Parallel Cancellation Expo',
      description: 'Testing multi-cancellation queue promotion',
      date: raceEventDate,
      startTime: '16:00',
      endTime: '18:00',
      location: 'Auditorium 3',
      clubId: 'club-robotics',
      capacity: 2,
    },
    clubCaller
  );
  await eventsService.approveEvent(cancelRaceEvt.eventId, adminCaller);

  // Register 2 seats
  await registrationService.registerForEvent(cancelRaceEvt.eventId, 'active-user-1', { name: 'Active 1', email: 'a1@test.edu' });
  await registrationService.registerForEvent(cancelRaceEvt.eventId, 'active-user-2', { name: 'Active 2', email: 'a2@test.edu' });

  // Waitlist 2 users
  await registrationService.registerForEvent(cancelRaceEvt.eventId, 'waitlist-user-1', { name: 'Wait 1', email: 'w1@test.edu' });
  await registrationService.registerForEvent(cancelRaceEvt.eventId, 'waitlist-user-2', { name: 'Wait 2', email: 'w2@test.edu' });

  // Both active users cancel at the same time
  const [cancelRes1, cancelRes2] = await Promise.all([
    registrationService.cancelRegistration(cancelRaceEvt.eventId, 'active-user-1'),
    registrationService.cancelRegistration(cancelRaceEvt.eventId, 'active-user-2'),
  ]);

  assertEqual(cancelRes1.status, 'success', 'Concurrent cancellation 1 succeeds');
  assertEqual(cancelRes2.status, 'success', 'Concurrent cancellation 2 succeeds');

  const promotedUsers = [cancelRes1.promotedUserId, cancelRes2.promotedUserId].sort();
  assertEqual(
    JSON.stringify(promotedUsers),
    JSON.stringify(['waitlist-user-1', 'waitlist-user-2']),
    'Concurrent cancellations promoted distinct waitlisted users without duplicate promotion'
  );

  const checkFinalEvt = await eventsService.getEventById(cancelRaceEvt.eventId);
  assertEqual(checkFinalEvt.registeredCount, 2, 'RegisteredCount preserved at 2 after 2 cancellations and 2 promotions');

  // -----------------------------------------------------------------
  // SUITE 7: Authorization, Identity Protection & Security Boundary
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 7: Identity Protection & Security Boundary ---');

  // Test 7.1: x-mock-user-id rejected outside of test environment
  process.env.NODE_ENV = 'production';
  const prodMockAttack = await handler({
    rawPath: '/api/admin/cleanup-expired',
    headers: {
      'x-mock-user-id': 'hacker-admin',
      'x-mock-user-role': 'admin',
    },
    requestContext: { http: { method: 'POST' } },
  });
  assertEqual(prodMockAttack.statusCode, 401, 'Mock authorization headers are rejected when NODE_ENV is production');
  process.env.NODE_ENV = 'test'; // Restore test env

  // Test 7.2: Club caller cannot forge clubId in POST /api/events
  const forgeClubRes = await handler({
    rawPath: '/api/events',
    requestContext: {
      http: { method: 'POST' },
      authorizer: { jwt: { claims: { sub: 'legit-club-owner', 'cognito:groups': ['club'] } } },
    },
    body: JSON.stringify({
      title: 'Hijacked Event',
      description: 'Trying to impersonate another club',
      date: raceEventDate,
      startTime: '09:00',
      endTime: '11:00',
      location: 'Lab B',
      clubId: 'victim-club-id', // Trying to forge victim club
      capacity: 50,
    }),
  });
  assertEqual(forgeClubRes.statusCode, 201, 'POST /api/events succeeds for club user');
  const forgedEventBody = JSON.parse(forgeClubRes.body);
  assertEqual(forgedEventBody.event.clubId, 'legit-club-owner', 'Backend forced clubId to authenticated caller userId, ignoring forged clubId');

  // Test 7.3: Registration route ignores spoofed userId in request body
  const spoofRegRes = await handler({
    rawPath: `/api/events/${raceEvent.eventId}/register`,
    requestContext: {
      http: { method: 'POST' },
      authorizer: { jwt: { claims: { sub: 'real-student-42', email: 'real@college.edu' } } },
    },
    body: JSON.stringify({
      userId: 'innocent-victim-student', // Attempted identity spoofing
      name: 'Spoofer',
      email: 'spoofer@hacker.com',
    }),
  });
  assertEqual(spoofRegRes.statusCode, 201, 'POST /api/events/{id}/register succeeds with 201 Created');
  const spoofRegStatus = await registrationService.getRegistrationStatus(raceEvent.eventId, 'innocent-victim-student');
  assertEqual(spoofRegStatus, null, 'Innocent victim was NOT registered');
  const realCallerStatus = await registrationService.getRegistrationStatus(raceEvent.eventId, 'real-student-42');
  assert(realCallerStatus !== null, 'Registration was credited to authenticated caller sub (real-student-42)');

  // Test 7.4: Role escalation attempt via custom:role claim without Cognito Group membership
  const escalateRes = await handler({
    rawPath: '/api/admin/cleanup-expired',
    requestContext: {
      http: { method: 'POST' },
      authorizer: {
        jwt: {
          claims: {
            sub: 'fake-admin-42',
            email: 'fakeadmin@college.edu',
            'custom:role': 'admin', // Malicious attempt to escalate via custom attribute
          },
        },
      },
    },
  });
  assertEqual(escalateRes.statusCode, 403, 'Admin endpoint rejects caller relying only on custom:role claim');

  // -----------------------------------------------------------------
  // SUITE 8: Edge Cases, GSI Eventual Consistency & Rescheduling Resiliency
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 8: GSI Lag, Rescheduling Resiliency & Bounded Batch Deletion ---');

  // Test 8.1: GSI Eventual Consistency / Replication Lag Simulation
  // Verify cancellation does NOT decrement registeredCount when queued candidate is missing from lagging GSI
  const gsiLagEvent = await eventsService.createEvent(
    {
      title: 'GSI Replication Lag Test',
      description: 'Testing resilience against GSI replication delay',
      date: raceEventDate,
      startTime: '08:00',
      endTime: '09:00',
      location: 'Lab C',
      clubId: 'club-robotics',
      capacity: 1,
    },
    clubCaller
  );
  await eventsService.approveEvent(gsiLagEvent.eventId, adminCaller);

  // Alice gets the only registered seat
  await registrationService.registerForEvent(gsiLagEvent.eventId, 'alice-user', { name: 'Alice', email: 'alice@c.edu' });
  // Bob joins waitlist
  await registrationService.registerForEvent(gsiLagEvent.eventId, 'bob-queued', { name: 'Bob', email: 'bob@c.edu' });

  // Simulate GSI replication lag: GSI_Waitlist query temporarily returns 0 items
  mockDb.setGsiLag(CONFIG.INDEXES.REGISTRATIONS_WAITLIST, true);

  // Alice cancels her registration while GSI is lagging
  const lagCancelRes = await registrationService.cancelRegistration(gsiLagEvent.eventId, 'alice-user');

  assertEqual(lagCancelRes.status, 'success', 'Cancellation succeeds during GSI replication lag');
  assertEqual(lagCancelRes.promotedUserId, 'bob-queued', 'Bob was promoted via strongly consistent base table read despite GSI lag');

  const gsiLagEvtCheck = await eventsService.getEventById(gsiLagEvent.eventId);
  assertEqual(gsiLagEvtCheck.registeredCount, 1, 'RegisteredCount remained strictly at 1 (capacity NOT decremented to 0)');
  assertEqual(gsiLagEvtCheck.waitlistCount, 0, 'WaitlistCount decremented to 0 after Bob was promoted');

  // Restore normal GSI behavior
  mockDb.setGsiLag(CONFIG.INDEXES.REGISTRATIONS_WAITLIST, false);

  // Test 8.2: Rescheduled Event Registration Protection During Stale Cleanup Scan
  // Create an event that was rescheduled to a future date
  const futureRescheduledDate = '2028-10-10';
  await mockDb.send({
    TableName: process.env.EVENTS_TABLE,
    Item: {
      eventId: 'rescheduled-event-1',
      title: 'Rescheduled Annual Gala',
      date: futureRescheduledDate, // Rescheduled by admin!
      status: EVENT_STATUS.APPROVED,
      capacity: 100,
      registeredCount: 2,
    },
  });

  // Add 2 active registrations for this event
  await mockDb.send({
    TableName: process.env.REGISTRATIONS_TABLE,
    Item: { eventId: 'rescheduled-event-1', userId: 'student-safe-1', status: 'registered' },
  });
  await mockDb.send({
    TableName: process.env.REGISTRATIONS_TABLE,
    Item: { eventId: 'rescheduled-event-1', userId: 'student-safe-2', status: 'registered' },
  });

  // Directly invoke cleanup on a stale event reference (simulating stale scan result prior to reschedule)
  const staleEventItem = { eventId: 'rescheduled-event-1', date: '2025-01-01' };
  // Mock cleanup scanning returning this stale item
  const origScan = mockDb.handleScan.bind(mockDb);
  mockDb.handleScan = (input) => {
    if (input.TableName === process.env.EVENTS_TABLE && input.FilterExpression?.includes(':today')) {
      return { Items: [staleEventItem] };
    }
    return origScan(input);
  };

  const cleanupRescheduled = await cleanupService.cleanupExpiredEvents();
  mockDb.handleScan = origScan; // Restore scan

  assertEqual(cleanupRescheduled.deletedCount, 0, 'Cleanup aborted: rescheduled event was NOT deleted');

  // Verify that NEITHER registration was deleted!
  const reg1Check = await registrationService.getRegistrationStatus('rescheduled-event-1', 'student-safe-1');
  const reg2Check = await registrationService.getRegistrationStatus('rescheduled-event-1', 'student-safe-2');
  assert(reg1Check !== null && reg1Check.status === 'registered', 'Registration 1 was preserved for rescheduled event');
  assert(reg2Check !== null && reg2Check.status === 'registered', 'Registration 2 was preserved for rescheduled event');

  // Test 8.3: Bounded Batch Deletion (>25 registrations)
  // Insert an expired event with 30 registrations to test batch chunking
  const batchExpiredId = 'batch-expired-event';
  await mockDb.send({
    TableName: process.env.EVENTS_TABLE,
    Item: {
      eventId: batchExpiredId,
      title: 'Mass Attendance 2024',
      date: '2024-05-01',
      status: EVENT_STATUS.APPROVED,
      capacity: 100,
      registeredCount: 30,
    },
  });

  for (let i = 1; i <= 30; i++) {
    await mockDb.send({
      TableName: process.env.REGISTRATIONS_TABLE,
      Item: { eventId: batchExpiredId, userId: `batch-stu-${i}`, status: 'registered' },
    });
  }

  const batchCleanupRes = await cleanupService.cleanupExpiredEvents();
  assert(batchCleanupRes.deletedCount >= 1, 'Cleanup successfully processed mass expired event');

  const checkBatchEvt = await eventsService.getEventById(batchExpiredId);
  assertEqual(checkBatchEvt, null, 'Mass expired event purged completely');
  const checkBatchReg = await registrationService.getRegistrationStatus(batchExpiredId, 'batch-stu-30');
  assertEqual(checkBatchReg, null, 'Mass event registrations purged across all bounded batches');

  // -----------------------------------------------------------------
  // SUITE 9: Newly Reconciled Endpoints & Production Guard Verification
  // -----------------------------------------------------------------
  console.log('\n--- SUITE 9: Reconciled Endpoints & Production Guard Verification ---');

  // Test 9.1: PUT /api/events/{eventId} - Club owner updates event
  const event9 = await eventsService.createEvent(
    {
      title: 'Robotics Workshop',
      description: 'Intro to Robotics',
      date: '2028-09-01',
      startTime: '10:00',
      endTime: '12:00',
      location: 'Lab A',
      capacity: 50,
    },
    clubCaller
  );

  const updateEvtRes = await handler({
    rawPath: `/api/events/${event9.eventId}`,
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'club-pres-1', 'cognito:groups': ['club'] } } },
    },
    body: JSON.stringify({ description: 'Updated robotics workshop description', capacity: 60 }),
  });
  assertEqual(updateEvtRes.statusCode, 200, 'PUT /api/events/{id} succeeds for owning club');

  // Test 9.2: PUT /api/events/{eventId} - Non-owner club user rejected (403)
  const nonOwnerUpdateRes = await handler({
    rawPath: `/api/events/${event9.eventId}`,
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'unauthorized-club-2', 'cognito:groups': ['club'] } } },
    },
    body: JSON.stringify({ description: 'Hijacked description' }),
  });
  assertEqual(nonOwnerUpdateRes.statusCode, 403, 'PUT /api/events/{id} rejected for non-owning club');

  // Test 9.3: PUT /api/events/{eventId} - Admin can update any club event
  const adminEvtUpdateRes = await handler({
    rawPath: `/api/events/${event9.eventId}`,
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': ['admin'] } } },
    },
    body: JSON.stringify({ name: 'Admin Overridden Name' }),
  });
  assertEqual(adminEvtUpdateRes.statusCode, 200, 'PUT /api/events/{id} succeeds for admin');

  // Test 9.4: PUT /api/events/{eventId} - Reducing capacity below registeredCount rejected
  await eventsService.approveEvent(event9.eventId, adminCaller);
  await registrationService.registerForEvent(event9.eventId, 'student-99', { name: 'Student 99', email: 's99@college.edu' });
  const badCapRes = await handler({
    rawPath: `/api/events/${event9.eventId}`,
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': ['admin'] } } },
    },
    body: JSON.stringify({ capacity: 0 }),
  });
  assert(badCapRes.statusCode >= 400, 'PUT /api/events/{id} rejects capacity lower than current registeredCount or <= 0');

  // Test 9.5: POST /api/events/{eventId}/feedback - Attended student submits rating & feedback
  const fbRes = await handler({
    rawPath: `/api/events/${event9.eventId}/feedback`,
    requestContext: {
      http: { method: 'POST' },
      authorizer: { jwt: { claims: { sub: 'student-99', email: 's99@college.edu' } } },
    },
    body: JSON.stringify({ rating: 5, feedback: 'Inspiring session!' }),
  });
  assertEqual(fbRes.statusCode, 200, 'POST /api/events/{id}/feedback succeeds for registered student');
  const fbBody = JSON.parse(fbRes.body);
  assertEqual(fbBody.registration.rating, 5, 'Feedback rating saved as 5');
  assertEqual(fbBody.registration.status, 'attended', 'Feedback updates registration status to attended');

  // Test 9.6: POST /api/events/{eventId}/feedback - Invalid rating (> 5) rejected
  const badFbRes = await handler({
    rawPath: `/api/events/${event9.eventId}/feedback`,
    requestContext: {
      http: { method: 'POST' },
      authorizer: { jwt: { claims: { sub: 'student-99', email: 's99@college.edu' } } },
    },
    body: JSON.stringify({ rating: 7 }),
  });
  assert(badFbRes.statusCode >= 400, 'POST /api/events/{id}/feedback rejects invalid rating > 5');

  // Test 9.7: PUT /api/clubs/{clubId} - President updates club profile
  await mockDb.send({
    TableName: process.env.CLUBS_TABLE,
    Item: {
      clubId: 'club-dance',
      name: 'Dance Club',
      presidentId: 'pres-club-1',
      faculty: 'Prof. Choreography',
      status: 'active',
    },
  });

  const updateClubRes = await handler({
    rawPath: '/api/clubs/club-dance',
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'pres-club-1', 'cognito:groups': ['club'] } } },
    },
    body: JSON.stringify({ description: 'Contemporary & Hip-Hop dance team' }),
  });
  assertEqual(updateClubRes.statusCode, 200, 'PUT /api/clubs/{id} succeeds for club president');

  // Test 9.8: PUT /api/clubs/{clubId} - Non-president rejected (403)
  const badClubUpdateRes = await handler({
    rawPath: '/api/clubs/club-dance',
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'other-user', 'cognito:groups': ['club'] } } },
    },
    body: JSON.stringify({ description: 'Unauthorized modification' }),
  });
  assertEqual(badClubUpdateRes.statusCode, 403, 'PUT /api/clubs/{id} rejected for non-president');

  // Test 9.9: PUT /api/clubs/{clubId} - Admin can update any club
  const adminClubUpdateRes = await handler({
    rawPath: '/api/clubs/club-dance',
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': ['admin'] } } },
    },
    body: JSON.stringify({ faculty: 'Prof. Dance Admin' }),
  });
  assertEqual(adminClubUpdateRes.statusCode, 200, 'PUT /api/clubs/{id} succeeds for admin');

  // Test 9.10: PUT & DELETE /api/locations/{locationId} - Non-admin rejected (403)
  const locItem = {
    locationId: 'loc-sem-hall',
    name: 'Seminar Hall B',
    capacity: 120,
    address: 'Block 2, Floor 1',
    campus: 'North Campus',
    isActive: true,
  };
  await mockDb.send({
    TableName: process.env.LOCATIONS_TABLE,
    Item: locItem,
  });

  const nonAdminLocPut = await handler({
    rawPath: '/api/locations/loc-sem-hall',
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'student-1' } } },
    },
    body: JSON.stringify({ capacity: 150 }),
  });
  assertEqual(nonAdminLocPut.statusCode, 403, 'PUT /api/locations/{id} rejected for non-admin');

  const nonAdminLocDel = await handler({
    rawPath: '/api/locations/loc-sem-hall',
    requestContext: {
      http: { method: 'DELETE' },
      authorizer: { jwt: { claims: { sub: 'student-1' } } },
    },
  });
  assertEqual(nonAdminLocDel.statusCode, 403, 'DELETE /api/locations/{id} rejected for non-admin');

  // Test 9.11: PUT & DELETE /api/locations/{locationId} - Admin can update and soft-delete
  const adminLocPut = await handler({
    rawPath: '/api/locations/loc-sem-hall',
    requestContext: {
      http: { method: 'PUT' },
      authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': ['admin'] } } },
    },
    body: JSON.stringify({ capacity: 150 }),
  });
  assertEqual(adminLocPut.statusCode, 200, 'PUT /api/locations/{id} succeeds for admin');

  const adminLocDel = await handler({
    rawPath: '/api/locations/loc-sem-hall',
    requestContext: {
      http: { method: 'DELETE' },
      authorizer: { jwt: { claims: { sub: 'admin-1', 'cognito:groups': ['admin'] } } },
    },
  });
  assertEqual(adminLocDel.statusCode, 200, 'DELETE /api/locations/{id} succeeds for admin');
  const checkLoc = await locationsService.getLocationById('loc-sem-hall');
  assertEqual(checkLoc.isActive, false, 'Location soft-deleted with isActive=false');

  // Test 9.12: Strict production mock-auth header rejection across routes
  process.env.NODE_ENV = 'production';
  const prodMockEvt = await handler({
    rawPath: `/api/events/${event9.eventId}`,
    headers: { 'x-mock-user-id': 'mock-attacker', 'x-mock-user-role': 'admin' },
    requestContext: { http: { method: 'PUT' } },
    body: JSON.stringify({ name: 'Hacked' }),
  });
  assertEqual(prodMockEvt.statusCode, 401, 'Mock authorization rejected on PUT /api/events/{id} when NODE_ENV is production');
  process.env.NODE_ENV = 'test';

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} passed, ${failedTests} failed.`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed with fatal error:', err);
  process.exit(1);
});
