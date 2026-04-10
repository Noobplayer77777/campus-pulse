# Google Calendar Export - Quick Start Guide

## What's Implemented ✅

Your application now has full Google Calendar export functionality! Here's what was added:

### 1. **Calendar Service Enhancements** 
📄 `src/services/calendarService.js`
- OAuth 2.0 authentication support
- `exportEventToGoogleCalendar()` - Export single events
- `exportEventsToGoogleCalendar()` - Batch export
- `initializeGoogleCalendar()` - Start OAuth flow
- `revokeGoogleCalendarAccess()` - Disconnect Google Calendar

### 2. **UI Components**
- **GoogleCalendarExport.jsx** - Ready-to-use export button component
  - Two variants: `button` (full button) and `icon` (compact icon)
  - Handles authentication flow automatically
  - Shows real-time success/error messages

- **OAuthCallback.jsx** - OAuth redirect handler
  - Automatically processes Google's authorization response
  - Exchanges auth code for access token

### 3. **App Routes**
- `/oauth-callback` - New route for Google OAuth redirect

### 4. **Documentation**
- **GOOGLE_CALENDAR_SETUP.md** - Complete setup instructions
- **GOOGLE_CALENDAR_INTEGRATION_EXAMPLE.js** - Code examples

---

## Quick Setup (5 minutes)

### Step 1: Get Google Credentials (2 min)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Consent screen configured
   - Web application client created
   - Redirect URI: `http://localhost:3000/oauth-callback`
5. Get your **Client ID**, **Client Secret**, and **API Key**

### Step 2: Set Environment Variables (1 min)
Create `.env.local`:
```env
REACT_APP_GOOGLE_CALENDAR_API_KEY=your_api_key
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=your_client_secret
```

### Step 3: Add to Your Event Cards (2 min)
In any component displaying events:
```jsx
import GoogleCalendarExport from '../components/GoogleCalendarExport';

<GoogleCalendarExport 
  event={{
    name: "Event Name",
    description: "Event description",
    date: "2026-04-15",
    time: "14:00",
    endTime: "15:30",
    location: "Room 101"
  }}
/>
```

### Step 4: Test
```bash
npm start
# Click "Connect Google Calendar" on any event
# Authorize with your Google account
# Export event
# Check your Google Calendar!
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/components/GoogleCalendarExport.jsx` | Export button component |
| `src/pages/OAuthCallback.jsx` | OAuth callback handler |
| `GOOGLE_CALENDAR_SETUP.md` | Complete setup guide |
| `GOOGLE_CALENDAR_INTEGRATION_EXAMPLE.js` | Code examples |

## Files Modified

| File | Changes |
|------|---------|
| `src/services/calendarService.js` | Added OAuth & export functions |
| `src/App.js` | Added `/oauth-callback` route |

---

## Usage Examples

### Example 1: Add Export to Event Card
```jsx
import GoogleCalendarExport from '../components/GoogleCalendarExport';

function EventCard({ event }) {
  return (
    <div className="event-card">
      <h3>{event.name}</h3>
      <p>{event.description}</p>
      <GoogleCalendarExport event={event} />
    </div>
  );
}
```

### Example 2: Icon Button Variant
```jsx
<GoogleCalendarExport 
  event={event}
  variant="icon"
/>
```

### Example 3: Manual Export
```jsx
import {
  initializeGoogleCalendar,
  exportEventToGoogleCalendar,
  isGoogleCalendarAuthenticated
} from '../services/calendarService';

// Check auth status
if (isGoogleCalendarAuthenticated()) {
  // Export event
  const result = await exportEventToGoogleCalendar(event);
  console.log(result.eventLink); // Link to event in Google Calendar
} else {
  // Start OAuth flow
  initializeGoogleCalendar();
}
```

### Example 4: Batch Export
```jsx
import { exportEventsToGoogleCalendar } from '../services/calendarService';

const results = await exportEventsToGoogleCalendar([
  eventA,
  eventB,
  eventC
]);

console.log(`Exported: ${results.successful.length}`);
console.log(`Failed: ${results.failed.length}`);
```

---

## Integration Points

### StudentDashboard
Add export button to approved events in browse view:
```jsx
{event.status === EVENT_STATUS.APPROVED && (
  <GoogleCalendarExport event={event} />
)}
```

### ClubDashboard
Allow clubs to export their created events:
```jsx
{event.createdBy === user?.uid && (
  <GoogleCalendarExport event={event} />
)}
```

### Profile Page
Show "My Calendar Integration" status:
```jsx
{isGoogleCalendarAuthenticated() && (
  <p>✅ Google Calendar connected</p>
)}
```

---

## Features

✨ **One-Click Export**
- Simple button click to add events to Google Calendar

🔐 **OAuth 2.0 Secure**
- Token-based authentication
- No password sharing
- User can revoke access anytime

📦 **Batch Operations**
- Export multiple events at once
- Bulk calendar sync

⚡ **Error Handling**
- Clear error messages
- Automatic token refresh
- Graceful fallbacks

🎨 **Flexible UI**
- Button or icon variants
- Matches your design system
- Customizable styling

---

## Environment Setup

### Local Development
```bash
# Create .env.local
REACT_APP_GOOGLE_CALENDAR_API_KEY=your_key
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
REACT_APP_GOOGLE_CLIENT_SECRET=your_secret

# Start
npm start
```

### Firebase Hosting Deployment
1. Set environment variables in Firebase Console
2. Deploy: `firebase deploy`
3. Update OAuth Redirect URI to production domain

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Not authenticated" | Click "Connect Google Calendar" button |
| "Invalid redirect URI" | Update URI in Google Cloud Console |
| Token expired | Click connect again to refresh |
| Export shows Forbidden | Check OAuth credentials in `.env.local` |
| Component not found | Import from `../components/GoogleCalendarExport` |

---

## Next Steps

1. ✅ **Setup credentials** in Google Cloud Console
2. ✅ **Add `.env.local`** with credentials
3. ✅ **Import component** in your event cards
4. ✅ **Test locally** with `npm start`
5. ✅ **Deploy to Firebase** when ready

---

## Security Notes

⚠️ **Keep credentials safe**
- Never commit `.env.local` to Git
- Use different credentials for prod/dev
- Rotate Client Secret if exposed

✅ **Token storage**
- Session tokens cleared when browser closes
- Refresh tokens in localStorage for long sessions
- Users can revoke access anytime

---

## Support

For detailed setup: See `GOOGLE_CALENDAR_SETUP.md`  
For code examples: See `GOOGLE_CALENDAR_INTEGRATION_EXAMPLE.js`  
For troubleshooting: Check browser console errors

**Happy calendar exporting! 📅✨**
