import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { useUI } from '../hooks/useUI';
import { EVENT_STATUS } from '../utils/constants';
import Calendar from '../components/Calendar';
import { ThreeDot } from 'react-loading-indicators';

// Neo-brutalism Event Card
function EventCardNeo({ event, onRegister, onUnregister, onRefresh, isRegistered, isQueued, queuePosition, isLoading }) {
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const capacityPercentage = (event.registeredCount / event.capacity) * 100;
  const isFull = event.registeredCount >= event.capacity;
  const difficulty = event.difficulty || 'beginner';
  const availableSpots = Math.max(0, event.capacity - event.registeredCount);

  const getDifficultyClass = (level) => {
    switch(level) {
      case 'beginner': return 'bg-green-100 border-green-400 text-black';
      case 'intermediate': return 'bg-yellow-100 border-yellow-400 text-black';
      case 'advanced': return 'bg-red-100 border-red-400 text-black';
      default: return 'bg-gray-100 border-gray-400 text-black';
    }
  };

  const getDifficultyLabel = (level) => {
    switch(level) {
      case 'beginner': return '🟢 Beginner';
      case 'intermediate': return '🟡 Intermediate';
      case 'advanced': return '🔴 Advanced';
      default: return '⚪ Beginner';
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh(event.eventId);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUnregisterClick = () => {
    const confirmed = window.confirm(
      `Are you sure you want to unregister from "${event.name}"? You can register again later.`
    );
    if (confirmed) {
      onUnregister(event.eventId);
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case EVENT_STATUS.APPROVED: return 'bg-secondary-container border-secondary text-black';
      case EVENT_STATUS.PENDING: return 'bg-yellow-300 border-black text-black';
      case EVENT_STATUS.REJECTED: return 'bg-error-container border-error text-black';
      default: return 'bg-surface border-black text-on-surface';
    }
  };

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-300 group">
      {/* Header with status badge */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <h3 className="font-headline font-black text-2xl uppercase text-black flex-1 leading-tight">{event.name}</h3>
        <span className={`font-label font-bold text-xs px-3 py-2 border-2 whitespace-nowrap ${getStatusClass(event.status)}`}>
          {event.status}
        </span>
      </div>

      {/* Event type and difficulty indicator */}
      <div className="mb-4 flex gap-2">
        <span className="font-label font-black text-sm uppercase bg-primary-container border-2 border-black px-3 py-1 inline-block">
          {event.type === 'solo' ? '👤 Solo' : '👥 Team'}
        </span>
        <span className={`font-label font-black text-sm uppercase border-2 px-3 py-1 inline-block ${getDifficultyClass(difficulty)}`}>
          {getDifficultyLabel(difficulty)}
        </span>
      </div>

      {/* Location and Time */}
      <div className="space-y-2 mb-4 pb-4 border-b-4 border-black">
        <div className="flex items-start gap-2 text-sm font-label">
          <span className="font-black text-lg">📍</span>
          <span className="font-body">{event.location}</span>
        </div>
        <div className="flex items-start gap-2 text-sm font-label">
          <span className="font-black text-lg">📅</span>
          <span className="font-body">{event.date} • {event.time}</span>
        </div>
      </div>

      {/* Capacity Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="font-label font-black text-xs uppercase">Capacity {isFull && '🔴 FULL'}</span>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2 px-2 py-1 bg-tertiary-container border-2 border-black font-label font-black text-xs uppercase hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh capacity count"
            >
              {isRefreshing ? '⟳ Updating...' : '🔄 Refresh'}
            </button>
          </div>
          <span className="font-headline font-black">{event.registeredCount}/{event.capacity}</span>
        </div>
        <div className="w-full bg-surface border-2 border-black h-6 overflow-hidden">
          <div 
            className={`h-full border-r-4 border-black transition-all ${isFull ? 'bg-error-container' : 'bg-primary-container'}`}
            style={{width: `${Math.min(capacityPercentage, 100)}%`}}
          />
        </div>
        {availableSpots > 0 && !isFull && (
          <p className="text-xs font-label font-bold text-green-600 mt-1">🆓 {availableSpots} spot{availableSpots !== 1 ? 's' : ''} available</p>
        )}
      </div>

      {/* Description */}
      <p className="text-sm font-body text-on-surface mb-4 line-clamp-2">{event.description}</p>

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

      {/* Expanded Details */}
      {showDetails && (
        <div className="pt-4 border-t-4 border-black space-y-4">
          <div>
            <h4 className="font-headline font-black text-sm uppercase mb-2 border-b-2 border-black pb-2">About</h4>
            <p className="text-sm font-body text-on-surface">{event.description}</p>
          </div>
          {event.tags && event.tags.length > 0 && (
            <div>
              <h4 className="font-headline font-black text-sm uppercase mb-2 border-b-2 border-black pb-2">Tags</h4>
              <div className="flex gap-2 flex-wrap">
                {event.tags.map((tag) => (
                  <span key={tag} className="font-label font-bold text-xs px-3 py-1 border-2 border-black bg-primary-container uppercase">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Student Dashboard
export default function StudentDashboard() {
  const { user } = useAuth();
  const { events, registrations, registerForEvent, cancelRegistration, leaveQueue, fetchUserRegistrations, fetchEvents, updateEventCapacity } = useEvents();
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState('browse');
  const [sortBy, setSortBy] = useState('upcoming');
  const [filters, setFilters] = useState({
    location: 'all',
    type: 'all',
    search: '',
    difficulty: 'all'
  });
  const [loadingEventId, setLoadingEventId] = useState(null);

  const approvedEvents = events.filter(e => e.status === EVENT_STATUS.APPROVED);
  
  // Calculate user stats
  const registeredCount = registrations.filter(r => r.status === 'registered').length;
  const queuedCount = registrations.filter(r => r.status === 'queued').length;
  const totalRegistrations = registrations.length;
  const upcomingEvents = approvedEvents.filter(e => new Date(e.date) > new Date()).length;
  
  const filteredEvents = approvedEvents.filter(event => {
    if (filters.location !== 'all' && event.location !== filters.location) return false;
    if (filters.type !== 'all' && event.type !== filters.type) return false;
    if (filters.difficulty !== 'all' && (event.difficulty || 'beginner') !== filters.difficulty) return false;
    if (filters.search && !event.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    switch(sortBy) {
      case 'upcoming':
        return new Date(a.date) - new Date(b.date);
      case 'latest':
        return new Date(b.date) - new Date(a.date);
      case 'capacity':
        return (a.registeredCount / a.capacity) - (b.registeredCount / b.capacity);
      case 'available':
        return b.capacity - b.registeredCount - (a.capacity - a.registeredCount);
      default:
        return 0;
    }
  });

  // Fetch user registrations on component mount
  useEffect(() => {
    if (user?.uid) {
      fetchUserRegistrations(user.uid);
    }
  }, [user?.uid, fetchUserRegistrations]);

  const handleRefresh = async (eventId) => {
    try {
      // Refresh all events to get the latest capacity for this event
      await fetchEvents({ dateRange: 'future' });
      showToast('✅ Capacity updated', 'success');
    } catch (error) {
      showToast(error.message || '❌ Failed to refresh', 'error');
    }
  };

  const handleRegister = async (eventId) => {
    setLoadingEventId(eventId);
    try {
      const result = await registerForEvent(user.uid, eventId);
      if (result.status === 'already_registered') {
        showToast('ℹ️ ' + result.message, 'warning');
        setLoadingEventId(null);
      } else if (result.status === 'queued') {
        showToast('⏳ ' + result.message, 'success');
        setLoadingEventId(null);
      } else {
        showToast('✅ ' + result.message, 'success');
        // Immediately update the event capacity in the UI
        const event = events.find(e => e.eventId === eventId);
        if (event) {
          updateEventCapacity(eventId, event.registeredCount + 1);
        }
        // Refresh registrations to show in "My Registrations" tab
        await fetchUserRegistrations(user.uid);
        // Refresh events after a small delay to ensure UI update is visible
        setTimeout(async () => {
          await fetchEvents({ dateRange: 'future' });
          setLoadingEventId(null);
        }, 800);
      }
    } catch (error) {
      showToast(error.message || '❌ Registration failed', 'error');
      setLoadingEventId(null);
    }
  };

  const handleUnregister = async (eventId) => {
    setLoadingEventId(eventId);
    try {
      const result = await cancelRegistration(user.uid, eventId);
      if (result && result.message) {
        showToast('✅ ' + result.message, 'success');
      } else {
        showToast('✅ Unregistered successfully', 'success');
      }
      // Immediately update the event capacity in the UI (decrease by 1)
      const event = events.find(e => e.eventId === eventId);
      if (event) {
        updateEventCapacity(eventId, Math.max(0, event.registeredCount - 1));
      }
      // Refresh registrations to update the list
      await fetchUserRegistrations(user.uid);
      // Refresh events after a small delay to ensure UI update is visible
      setTimeout(async () => {
        await fetchEvents({ dateRange: 'future' });
        setLoadingEventId(null);
      }, 800);
    } catch (error) {
      showToast(error.message || '❌ Unregistration failed', 'error');
      setLoadingEventId(null);
    }
  };

  const handleCancel = async (eventId) => {
    setLoadingEventId(eventId);
    try {
      const result = await cancelRegistration(user.uid, eventId);
      if (result && result.message) {
        showToast('✅ ' + result.message, 'success');
      } else {
        showToast('✅ Cancelled successfully', 'success');
      }
      // Immediately update the event capacity in the UI (decrease by 1)
      const event = events.find(e => e.eventId === eventId);
      if (event) {
        updateEventCapacity(eventId, Math.max(0, event.registeredCount - 1));
      }
      // Refresh registrations to update the list
      await fetchUserRegistrations(user.uid);
      // Refresh events after a small delay to ensure UI update is visible
      setTimeout(async () => {
        await fetchEvents({ dateRange: 'future' });
        setLoadingEventId(null);
      }, 800);
    } catch (error) {
      showToast(error.message || '❌ Cancellation failed', 'error');
      setLoadingEventId(null);
    }
  };

  const handleLeaveQueue = async (eventId) => {
    setLoadingEventId(eventId);
    try {
      const result = await leaveQueue(user.uid, eventId);
      if (result && result.message) {
        showToast('✅ ' + result.message, 'success');
      } else {
        showToast('✅ Left the queue', 'success');
      }
      // Refresh registrations to update the list
      await fetchUserRegistrations(user.uid);
      // Refresh events after a small delay to ensure UI update is visible
      setTimeout(async () => {
        await fetchEvents({ dateRange: 'future' });
        setLoadingEventId(null);
      }, 800);
    } catch (error) {
      showToast(error.message || '❌ Failed to leave queue', 'error');
      setLoadingEventId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Neo-brutalism */}
      <div className="bg-primary-container border-b-4 border-black px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-headline font-black text-6xl uppercase text-black mb-2 italic">
            🎉 Your Campus Pulse
          </h1>
          <p className="font-body text-xl text-black">Welcome back, <span className="font-headline font-black">{user?.displayName || 'Student'}!</span> Ready for your next event?</p>          
          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t-4 border-black">
            <div className="bg-white border-3 border-black px-4 py-3">
              <p className="font-label font-black text-xs uppercase text-gray-600">Registered</p>
              <p className="font-headline font-black text-3xl text-black">{registeredCount}</p>
            </div>
            <div className="bg-yellow-100 border-3 border-black px-4 py-3">
              <p className="font-label font-black text-xs uppercase text-gray-600">In Queue</p>
              <p className="font-headline font-black text-3xl text-black">{queuedCount}</p>
            </div>
            <div className="bg-blue-100 border-3 border-black px-4 py-3">
              <p className="font-label font-black text-xs uppercase text-gray-600">Upcoming</p>
              <p className="font-headline font-black text-3xl text-black">{upcomingEvents}</p>
            </div>
            <div className="bg-green-100 border-3 border-black px-4 py-3">
              <p className="font-label font-black text-xs uppercase text-gray-600">Total Events</p>
              <p className="font-headline font-black text-3xl text-black">{approvedEvents.length}</p>
            </div>
          </div>        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation - Neo-brutalism with heavy borders */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 flex-wrap">
          {[
            { id: 'browse', label: '🔍 Browse Events' },
            { id: 'registered', label: '📋 My Registrations' },
            { id: 'calendar', label: '📅 Event Calendar' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 ${
                activeTab === tab.id
                  ? 'bg-primary-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                  : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Browse Events Tab */}
        {activeTab === 'browse' && (
          <div>
            {/* Featured Events Section */}
            {filteredEvents.length > 0 && (
              <div className="mb-12">
                <div className="bg-gradient-to-r from-primary-container to-secondary-container border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-6">
                  <h2 className="font-headline font-black text-3xl uppercase text-black mb-4">⭐ Featured Events</h2>
                  <p className="font-body text-black">{approvedEvents.length} amazing events happening this season. Don't miss out! Hurry up!</p>
                </div>
              </div>
            )}

            {/* Filters with Neo-brutalism */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <input
                type="text"
                placeholder="🔍 Search events..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
              />
              <select
                value={filters.location}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                className="px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
              >
                <option value="all">📍 All Locations</option>
                {[...new Set(approvedEvents.map(e => e.location))].map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
              >
                <option value="all">👥 All Types</option>
                <option value="solo">👤 Solo Events</option>
                <option value="team">👥 Team Events</option>
              </select>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
                className="px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
              >
                <option value="all">📊 All Levels</option>
                <option value="beginner">🟢 Beginner</option>
                <option value="intermediate">🟡 Intermediate</option>
                <option value="advanced">🔴 Advanced</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
              >
                <option value="upcoming">📅 Upcoming First</option>
                <option value="latest">⏰ Latest Events</option>
                <option value="capacity">📊 Most Full</option>
                <option value="available">🆓 Most Available</option>
              </select>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                  <EventCardNeo
                    key={event.eventId}
                    event={event}
                    onRegister={handleRegister}
                    onUnregister={handleUnregister}
                    onRefresh={handleRefresh}
                    isRegistered={registrations.some(r => r.eventId === event.eventId && r.status === 'registered')}
                    isQueued={registrations.some(r => r.eventId === event.eventId && r.status === 'queued')}
                    queuePosition={registrations.find(r => r.eventId === event.eventId && r.status === 'queued')?.queuePosition}
                    isLoading={loadingEventId === event.eventId}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-16 bg-surface-container border-4 border-black">
                  <p className="font-headline font-black text-3xl uppercase text-on-surface mb-4">🔍 No Events Found</p>
                  <p className="font-body text-lg text-on-surface">Try adjusting your filters or check back soon for more events!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Registered Events Tab */}
        {activeTab === 'registered' && (
          <div>
            {registrations.length > 0 ? (
              <div className="space-y-4">
                {registrations.map(reg => {
                  const event = reg.event || events.find(e => e.eventId === reg.eventId);
                  if (!event) return null;
                  return (
                    <div key={reg.registrationId} className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex-1">
                          <h3 className="font-headline font-black text-2xl uppercase text-black">{event.name}</h3>
                          <p className="font-body text-sm text-on-surface mt-2">📍 {event.location}</p>
                          <p className="font-body text-sm text-on-surface">📅 {event.date} • {event.time}</p>
                          <p className="font-body text-sm text-on-surface mt-2">Registered: <span className="font-headline font-black">{event.registeredCount}/{event.capacity}</span></p>
                        </div>
                        <span className={`px-4 py-2 border-3 border-black font-label font-black text-sm uppercase ${
                          reg.status === 'registered' ? 'bg-secondary-container text-black' : 'bg-yellow-300 text-black'
                        }`}>
                          {reg.status === 'registered' ? '✓ Registered' : `Queue #${reg.queuePosition}`}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        {reg.status === 'registered' && (
                          loadingEventId === event.eventId ? (
                            <div className="px-4 py-2 border-4 border-black bg-gray-200 font-headline font-black uppercase text-sm flex items-center justify-center flex-1">
                              <ThreeDot variant="pulsate" color="#32cd32" size="small" text="" textColor="#000000" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCancel(event.eventId)}
                              className="px-4 py-2 border-4 border-black bg-error-container font-headline font-black uppercase text-sm hover:-translate-y-1 transition-all"
                            >
                              Cancel
                            </button>
                          )
                        )}
                        {reg.status === 'queued' && (
                          loadingEventId === event.eventId ? (
                            <div className="px-4 py-2 border-4 border-black bg-gray-200 font-headline font-black uppercase text-sm flex items-center justify-center flex-1">
                              <ThreeDot variant="pulsate" color="#32cd32" size="small" text="" textColor="#000000" />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleLeaveQueue(event.eventId)}
                              className="px-4 py-2 border-4 border-black bg-yellow-300 font-headline font-black uppercase text-sm hover:-translate-y-1 transition-all"
                            >
                              Leave Queue
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-surface-container border-4 border-black">
                <p className="font-headline font-black text-3xl uppercase text-on-surface mb-4">📋 No Registrations Yet</p>
                <p className="font-body text-lg text-on-surface">Start signing up for events to see them here!</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div>
            <div className="mb-8">
              <h2 className="font-headline font-black text-4xl uppercase text-black mb-4 border-b-4 border-black pb-4">
                📅 Event Calendar
              </h2>
              <p className="font-body text-on-surface mb-6">View all approved events on a calendar. Click on a date to see events scheduled for that day.</p>
            </div>
            <Calendar 
              events={approvedEvents} 
              highlightColor="bg-primary-container"
            />
          </div>
        )}
      </div>
    </div>
  );
}
