/**
 * Example: How to integrate Google Calendar export into StudentDashboard
 * 
 * This file shows where and how to add the GoogleCalendarExport button
 * to existing event cards in your StudentDashboard
 * 
 * Location: src/pages/StudentDashboard.jsx
 * Component: EventCardNeo
 */

// Step 1: Import at top of StudentDashboard.jsx
import GoogleCalendarExport from '../components/GoogleCalendarExport';

// Step 2: In the EventCardNeo component, add this to the action buttons section
// Around line 143-145 where other action buttons are located:

/*
{/* Action Buttons */}
<div className="flex gap-2 mb-3">
  {isLoading ? (
    <div className="flex-1 bg-gray-200 border-3 border-black py-3 px-3 text-center flex items-center justify-center">
      <ThreeDot variant="pulsate" color="#32cd32" size="medium" text="Loading" textColor="#000000" />
    </div>
  ) : isRegistered ? (
    <button
      onClick={handleUnregisterClick}
      className="flex-1 bg-secondary-container border-3 border-black py-3 px-3 text-center font-label font-black text-sm uppercase text-black hover:-translate-y-1 transition-all cursor-pointer"
    >
      ✓ Registered
    </button>
  ) : isQueued ? (
    <div className="flex-1 bg-yellow-300 border-3 border-black py-3 px-3 text-center">
      <span className="font-label font-black text-sm uppercase text-black">Queue #{queuePosition}</span>
    </div>
  ) : event.status === EVENT_STATUS.APPROVED ? (
    <button
      onClick={() => onRegister(event.eventId)}
      className={`flex-1 font-headline font-black py-3 px-3 border-4 border-black uppercase text-sm transition-all ${
        isFull 
          ? 'bg-error-container text-black hover:-translate-y-1' 
          : 'bg-primary-container text-black hover:-translate-y-1'
      }`}
    >
      {isFull ? '📋 Join Queue' : '➕ Register'}
    </button>
  ) : null}
  
  <button
    onClick={() => setShowDetails(!showDetails)}
    className="px-4 py-3 bg-surface border-4 border-black font-headline font-black uppercase text-sm hover:-translate-y-1 transition-all"
  >
    {showDetails ? '▼' : '▶'}
  </button>
</div>

{/* NEW: Add Google Calendar Export Button */}
{event.status === EVENT_STATUS.APPROVED && (
  <div className="mb-4 pt-4 border-t-4 border-black">
    <GoogleCalendarExport 
      event={{
        name: event.name,
        description: event.description,
        date: event.date,
        time: event.time,
        endTime: event.endTime,
        location: event.location
      }}
      variant="button"
    />
  </div>
)}

{/* Expanded Details */}
{showDetails && (
*/

// Alternative: Add export icon button next to details button

/*
// In the action buttons div, replace the simple details button with this:
<div className="flex gap-2 flex-1">
  <button
    onClick={() => setShowDetails(!showDetails)}
    className="flex-1 px-4 py-3 bg-surface border-4 border-black font-headline font-black uppercase text-sm hover:-translate-y-1 transition-all"
  >
    {showDetails ? '▼' : '▶'}
  </button>
  {event.status === EVENT_STATUS.APPROVED && (
    <GoogleCalendarExport 
      event={{
        name: event.name,
        description: event.description,
        date: event.date,
        time: event.time,
        endTime: event.endTime,
        location: event.location
      }}
      variant="icon"
    />
  )}
</div>
*/

/**
 * Step 3: If you want to add it in ClubDashboard as well
 * 
 * In src/pages/ClubDashboard.jsx, add similar integration:
 */

/*
// For club events (where they can export their own created events)
{event.createdBy === user?.uid && event.status === EVENT_STATUS.APPROVED && (
  <GoogleCalendarExport 
    event={{
      name: event.name,
      description: event.description,
      date: event.date,
      time: event.time,
      endTime: event.endTime,
      location: event.location
    }}
  />
)}
*/

/**
 * Step 4: Customization Options
 * 
 * The GoogleCalendarExport component supports these props:
 */

interface GoogleCalendarExportProps {
  event: {
    name: string;           // Event name
    description?: string;   // Event description
    date: string;          // Date in YYYY-MM-DD format
    time: string;          // Start time in HH:MM format
    endTime: string;       // End time in HH:MM format
    location?: string;     // Event location
  };
  variant?: 'button' | 'icon'; // Display variant (default: 'button')
}

/**
 * Step 5: Styling
 * 
 * The component comes with default Tailwind styles but you can customize:
 * - Button color: Change 'bg-blue-500' to your brand color
 * - Text: Modify the button labels
 * - Icon: Use different emoji or SVG icons
 */

// Example: Styled for neo-brutalism to match your design system
/*
<GoogleCalendarExport 
  event={event}
  variant="button"
  className="w-full font-headline font-black border-3 border-black py-3 px-3 bg-primary-container text-black uppercase hover:-translate-y-1 transition-all"
/>
*/

/**
 * Step 6: Testing Locally
 * 
 * 1. Create .env.local with your Google credentials
 * 2. Start development server: npm start
 * 3. Navigate to an event page
 * 4. Click "Connect Google Calendar" button
 * 5. Follow OAuth flow
 * 6. Click "Export to Google Calendar" to add event
 * 7. Event should appear in your Google Calendar
 */

// Export for reference
export const INTEGRATION_GUIDE = {
  step1: 'Import GoogleCalendarExport component',
  step2: 'Add component to event card with event data',
  step3: 'Configure Google Calendar credentials (see GOOGLE_CALENDAR_SETUP.md)',
  step4: 'Test with npm start',
  step5: 'Deploy to Firebase'
};
