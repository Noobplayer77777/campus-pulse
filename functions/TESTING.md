/**
 * Example Firestore data structure for testing Cloud Functions
 * 
 * Use this to create sample data in Firestore for testing the Cloud Functions
 */

// Example Event Document
const exampleEvent = {
  title: "Web Development Workshop",
  date: new Date("2026-04-15"),
  description: "Learn modern web development with React and Firebase",
  location: "Building A, Room 101",
  capacity: 5,
  originalCapacity: 5,
  maxCapacity: 5,
  registrationDeadline: new Date("2026-04-14"),
  organizer: "Computer Science Club",
  createdAt: new Date(),
  lastUpdated: new Date(),
};

// Example Registration Document (subcollection inside an event)
const exampleRegistration = {
  userId: "user_123",
  userName: "John Doe",
  userEmail: "john@university.edu",
  registeredAt: new Date(),
  status: "confirmed",
  checkInTime: null,
};

/**
 * How to test:
 * 
 * 1. Create an event in Firestore:
 *    Collection: events
 *    Document ID: event_001
 *    Data: exampleEvent
 * 
 * 2. Create a registration subcollection inside the event:
 *    Path: events/event_001/registrations/reg_001
 *    Data: exampleRegistration
 * 
 * 3. Expected behavior:
 *    - When reg_001 is created, event_001.capacity should decrease to 4
 *    - When reg_001 is deleted, event_001.capacity should increase to 5
 *    - If capacity is already 0, new registrations should fail
 * 
 * 4. Deploy the functions:
 *    firebase deploy --only functions
 * 
 * 5. Monitor logs:
 *    firebase functions:log
 */
