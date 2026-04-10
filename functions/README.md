# Cloud Functions for College Events

This directory contains Firebase Cloud Functions for automatically managing event capacity based on registration changes.

## Overview

The Cloud Functions monitor changes to the `registrations` subcollection within each event and automatically update the event's capacity field to reflect available seats.

## Functions

### 1. `onRegistrationCreated`

**Trigger**: Firestore onCreate for `events/{eventId}/registrations/{registrationId}`

**Purpose**: Decreases event capacity when a user registers

**Logic**:
- Uses Firestore transaction for atomicity
- Checks if capacity > 0 (prevents overbooking)
- Decreases capacity by 1
- Ensures capacity never goes below 0
- Logs the operation with Firebase Cloud Logging

**Example Path**: `events/event_123/registrations/user_456`

### 2. `onRegistrationDeleted`

**Trigger**: Firestore onDelete for `events/{eventId}/registrations/{registrationId}`

**Purpose**: Increases event capacity when a registration is cancelled

**Logic**:
- Uses Firestore transaction for atomicity
- Increases capacity by 1
- Respects the original event capacity (doesn't exceed it)
- Logs the operation with Firebase Cloud Logging

**Example Path**: `events/event_123/registrations/user_456`

### 3. `checkEventAvailability` (Optional)

**Trigger**: Callable HTTPS function

**Purpose**: Client-side function to verify capacity before registration

**Usage from React**:
```javascript
const checkAvailability = firebase.functions().httpsCallable('checkEventAvailability');

checkAvailability({ eventId: 'event_123' })
  .then((result) => {
    console.log(result.data); // { eventId, title, capacity, isAvailable, message }
  })
  .catch((error) => console.error(error));
```

## Setup & Deployment

### Prerequisites
- Node.js 20 or higher
- Firebase CLI installed
- Firebase project configured

### Installation

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install
```

### Local Testing

```bash
# From project root
firebase emulators:start --only functions

# Or from functions directory
npm run serve
```

### Deployment

```bash
# From project root
firebase deploy --only functions

# Or from functions directory
npm run deploy
```

### Monitor Logs

```bash
# View function logs in real-time
firebase functions:log
```

## Firestore Structure

Your Firestore should have the following structure:

```
firestore/
├── events/
│   └── {eventId}/
│       ├── title: string
│       ├── date: timestamp
│       ├── capacity: number (current available seats)
│       ├── originalCapacity: number (initial capacity)
│       ├── lastUpdated: timestamp
│       └── registrations/
│           └── {registrationId}/
│               ├── userId: string
│               ├── userName: string
│               ├── registeredAt: timestamp
│               └── ... (other registration fields)
```

## Important Notes

### Atomicity & Race Conditions
- All capacity updates use **Firestore transactions** to prevent race conditions
- Multiple simultaneous registrations are handled safely
- The transaction ensures atomic read-check-update operations

### Constraints
- **Prevent Overbooking**: If capacity is 0, new registrations will fail with an error
- **No Negative Capacity**: Capacity is never allowed to go below 0
- **Respect Original Capacity**: When cancelling, capacity won't exceed the original capacity

### Error Handling
- All errors are logged with timestamps and detailed context
- Functions re-throw errors so Firebase knows the operation failed
- Check Cloud Logging in Firebase Console for error details

### Logging
Functions use Firebase Cloud Logging with the following details:
- Operation type (created/deleted)
- Previous and new capacity values
- User registration IDs
- Timestamps
- Error messages and codes

## Testing Checklist

- [ ] Deploy functions to Firebase
- [ ] Create a test event with `capacity: 5` and `originalCapacity: 5`
- [ ] Add a registration document → capacity should be 4
- [ ] Add another registration → capacity should be 3
- [ ] Delete a registration → capacity should be 4
- [ ] Try to register when capacity is 0 → should fail with error
- [ ] Check Cloud Logging for proper logs
- [ ] Test multiple simultaneous registrations

## Troubleshooting

### Function not triggering?
- Check if document path matches `events/{eventId}/registrations/{registrationId}`
- Verify Firestore security rules allow the operations
- Check Cloud Logging for errors

### Capacity not updating?
- Verify the event document exists in Firestore
- Check that `capacity` field exists in the event document
- Look for transaction failures in Cloud Logging

### Overbooking errors?
- This is expected behavior—capacity is 0, no more registrations allowed
- Implement client-side UI to disable registration when capacity is 0

## Performance Considerations

- Transactions are strong consistent within the same document
- For high-volume registrations, consider implementing a queuing system
- Monitor function execution time in the Firebase Console

## Security

- Use Firestore security rules to control who can create/delete registrations
- Functions run with elevated privileges (admin SDK)
- Always validate user authentication in callable functions
