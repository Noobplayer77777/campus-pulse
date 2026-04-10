# Google Calendar Export Setup Guide

This guide will walk you through setting up Google Calendar export functionality for the Campus Pulse event system.

## Overview

The system supports two modes:
1. **Read-Only Mode** - View Google Calendar events (uses API Key)
2. **Export Mode** - Add events to Google Calendar (uses OAuth 2.0)

## Prerequisites

- Google Cloud Project (create one at [Google Cloud Console](https://console.cloud.google.com))
- Admin access to configure OAuth consent screen
- Your application's domain/local development URL

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a Project** → **New Project**
3. Enter project name: `Campus Pulse Calendar`
4. Click **Create**
5. Wait for the project to be created

---

## Step 2: Enable Google Calendar API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for `Google Calendar API`
3. Click on **Google Calendar API**
4. Click **Enable**

---

## Step 3: Create OAuth 2.0 Credentials

### 3a. Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (for public use)
3. Click **Create**
4. Fill in the form:
   - **App name**: `Campus Pulse Events`
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**
6. (Scopes) Click **Add or Remove Scopes**
7. Search for and select: `https://www.googleapis.com/auth/calendar`
8. Click **Update** → **Save and Continue**
9. (Test users) Add your email address if in development
10. Click **Save and Continue** → **Back to Dashboard**

### 3b. Create OAuth 2.0 Client ID

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Under **Authorized redirect URIs**, add:
   ```
   http://localhost:3000/oauth-callback        (for local development)
   https://yourdomain.com/oauth-callback       (for production)
   ```
5. Click **Create**
6. Copy the **Client ID** and **Client Secret** (keep these safe!)

---

## Step 4: Create API Key (for read-only access)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy your **API Key**

---

## Step 5: Configure Environment Variables

### For Local Development (.env.local)

Create a `.env.local` file in your project root:

```env
# Google Calendar - Read-only access
REACT_APP_GOOGLE_CALENDAR_API_KEY=YOUR_API_KEY_HERE

# Google Calendar - OAuth 2.0 (for export)
REACT_APP_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
REACT_APP_GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

### For Firebase Hosting (Production)

1. Go to your Firebase Console → Project Settings → Environment Variables
2. Add the same variables:
   - `REACT_APP_GOOGLE_CALENDAR_API_KEY`
   - `REACT_APP_GOOGLE_CLIENT_ID`
   - `REACT_APP_GOOGLE_CLIENT_SECRET`

Or set them in `firebase.json`:

```json
{
  "functions": {
    "source": "functions",
    "environment": {
      "REACT_APP_GOOGLE_CLIENT_ID": "YOUR_CLIENT_ID",
      "REACT_APP_GOOGLE_CLIENT_SECRET": "YOUR_CLIENT_SECRET"
    }
  }
}
```

---

## Step 6: Update Redirect URI in Google Cloud Console

After deploying to Firebase or your production domain:

1. Go to **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Add your production redirect URI:
   ```
   https://college-event-system-204e2.web.app/oauth-callback
   ```
4. Click **Save**

---

## Step 7: Use in Your Application

### Basic Usage in Components

```jsx
import { GoogleCalendarExport } from '../components/GoogleCalendarExport';

// In your event card or event details page:
<GoogleCalendarExport 
  event={{
    name: "Tech Talk",
    description: "Learn about web development",
    date: "2026-04-15",
    time: "14:00",
    endTime: "15:30",
    location: "Auditorium 101"
  }}
/>
```

### Manual Export in Code

```jsx
import {
  initializeGoogleCalendar,
  exportEventToGoogleCalendar,
  isGoogleCalendarAuthenticated,
  revokeGoogleCalendarAccess
} from '../services/calendarService';

// Check if authenticated
if (isGoogleCalendarAuthenticated()) {
  // Export event
  const result = await exportEventToGoogleCalendar({
    name: "Event Name",
    description: "Event details",
    date: "2026-04-15",
    time: "14:00",
    endTime: "15:30",
    location: "Location"
  });
  console.log('Event exported:', result.eventLink);
} else {
  // Start OAuth flow
  initializeGoogleCalendar();
}

// Disconnect later
await revokeGoogleCalendarAccess();
```

### Export Multiple Events

```jsx
import { exportEventsToGoogleCalendar } from '../services/calendarService';

const results = await exportEventsToGoogleCalendar([
  { name: "Event 1", ... },
  { name: "Event 2", ... },
  { name: "Event 3", ... }
]);

console.log('Successful:', results.successful.length);
console.log('Failed:', results.failed.length);
```

---

## Integration with StudentDashboard

Add export button to event cards in `StudentDashboard.jsx`:

```jsx
import GoogleCalendarExport from '../components/GoogleCalendarExport';

// In EventCardNeo component:
<GoogleCalendarExport 
  event={event}
  variant="button"
/>
```

Or use icon variant:

```jsx
<GoogleCalendarExport 
  event={event}
  variant="icon"
/>
```

---

## Features

✅ **One-click export** - Export any event to your Google Calendar  
✅ **OAuth authentication** - Secure, token-based access  
✅ **Batch export** - Export multiple events at once  
✅ **Auto disconnect** - Revoke access anytime  
✅ **Persistent tokens** - Session storage with secure backup  
✅ **Error handling** - User-friendly error messages  

---

## Troubleshooting

### "Not authenticated with Google Calendar"
- User hasn't clicked "Connect Google Calendar" yet
- Token session has expired (refresh by clicking connect again)

### "Export failed: Forbidden"
- Missing or invalid OAuth credentials
- User hasn't granted calendar access permissions
- Check that credentials are properly set in environment variables

### "Invalid redirect URI"
- The URI in Google Cloud Console doesn't match your app's URL
- Make sure to update redirect URI in Google Cloud Console for production domain

### "API key not configured"
- `REACT_APP_GOOGLE_CALENDAR_API_KEY` is missing or invalid
- Check `.env.local` file is properly configured
- Restart development server after changing env vars

### Localhost vs Production
- Development: Use `http://localhost:3000/oauth-callback`
- Production: Use your actual domain

---

## Security Notes

⚠️ **Never commit secrets** - Keep `.env.local` in `.gitignore`  
⚠️ **Rotate credentials** - Change Client Secret if exposed  
⚠️ **Token storage** - Session tokens are stored in sessionStorage (cleared on browser close)  
⚠️ **Refresh tokens** - Stored in localStorage for long-term access (handle carefully)  

---

## Additional Resources

- [Google Calendar API Docs](https://developers.google.com/calendar)
- [OAuth 2.0 Flow](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com)
- [Firebase Environment Variables](https://firebase.google.com/docs/functions/config-env)

---

## Production Deployment Checklist

- [ ] API Key configured in Firebase environment
- [ ] Client ID configured in Firebase environment
- [ ] Client Secret configured in Firebase environment
- [ ] Redirect URI added to Google Cloud Console OAuth settings
- [ ] HTTPS enforced on production domain
- [ ] OAuth consent screen marked as "publish" (not testing)
- [ ] Privacy policy URL configured in Google Cloud
- [ ] Test export with real Google account
- [ ] Verify events appear in Google Calendar

---

**Need help?** Check the console for detailed error messages or review the service implementation in `src/services/calendarService.js`
