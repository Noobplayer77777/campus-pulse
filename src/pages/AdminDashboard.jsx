import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { useUI } from '../hooks/useUI';
import { EVENT_STATUS } from '../utils/constants';
import Calendar from '../components/Calendar';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { events, fetchEvents, approveEvent, rejectEvent, cancelEvent } = useEvents();
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState('approvals');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingEventId, setRejectingEventId] = useState(null);

  // Fetch events on component mount
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const pendingEvents = events.filter(e => e.status === EVENT_STATUS.PENDING);
  const approvedEvents = events.filter(e => e.status === EVENT_STATUS.APPROVED);
  const rejectedEvents = events.filter(e => e.status === EVENT_STATUS.REJECTED);

  const stats = {
    totalEvents: events.length,
    pendingApprovals: pendingEvents.length,
    totalRegistrations: events.reduce((sum, e) => sum + e.registeredCount, 0),
    approvalRate: events.length > 0 ? ((approvedEvents.length / events.length) * 100).toFixed(0) : 0,
  };

  const handleApprove = async (eventId) => {
    try {
      await approveEvent(eventId, user.uid);
      showToast('✨ Event approved!', 'success');
    } catch (error) {
      console.error('Error approving event:', error);
      showToast(error.message || '❌ Failed to approve event', 'error');
    }
  };

  const handleReject = async (eventId) => {
    try {
      await rejectEvent(eventId, user.uid, rejectReason);
      showToast('✓ Event rejected', 'success');
      setRejectingEventId(null);
      setRejectReason('');
    } catch (error) {
      console.error('Error rejecting event:', error);
      showToast(error.message || '❌ Failed to reject event', 'error');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      await cancelEvent(eventId, user.uid, 'Removed from calendar by admin');
      showToast('🗑️ Event removed from calendar', 'success');
      // Refresh events to reflect deletion
      await fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      showToast(error.message || '❌ Failed to delete event', 'error');
    }
  };

  // Neo-brutalism Stat Card
  const StatCard = ({ label, value, icon, bgColor }) => (
    <div className={`${bgColor} border-4 border-black p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label font-black text-xs uppercase text-on-surface mb-2">{label}</p>
          <p className="font-headline font-black text-5xl text-black">{value}</p>
        </div>
        <span className="text-5xl">{icon}</span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Neo-brutalism */}
      <div className="bg-tertiary-container border-b-4 border-black px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-headline font-black text-6xl uppercase text-black mb-2 italic">
            🛡️ Admin Control
          </h1>
          <p className="font-body text-xl text-black">Review, Approve & Keep the Pulse Beating</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid - Neo-brutalism */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard label="Total Events" value={stats.totalEvents} icon="📊" bgColor="bg-primary-container" />
          <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon="⏳" bgColor="bg-yellow-300" />
          <StatCard label="Total Registrations" value={stats.totalRegistrations} icon="👥" bgColor="bg-secondary-container" />
          <StatCard label="Approval Rate" value={`${stats.approvalRate}%`} icon="✓" bgColor="bg-tertiary-container" />
        </div>

        {/* Tab Navigation - Neo-brutalism */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 whitespace-nowrap ${
              activeTab === 'approvals'
                ? 'bg-yellow-300 border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            ⏳ Pending ({pendingEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 whitespace-nowrap ${
              activeTab === 'approved'
                ? 'bg-secondary-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            ✓ Approved ({approvedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 whitespace-nowrap ${
              activeTab === 'rejected'
                ? 'bg-error-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            ✗ Rejected ({rejectedEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-tertiary-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            📅 All Events Calendar
          </button>
        </div>

        {/* Pending Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            {pendingEvents.length > 0 ? (
              pendingEvents.map(event => (
                <div key={event.eventId} className="bg-yellow-300 border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4">
                    <div>
                      <h3 className="font-headline font-black text-2xl uppercase text-black">{event.name}</h3>
                      <p className="font-body text-sm text-on-surface mt-2">📍 {event.location}</p>
                      <p className="font-body text-sm text-on-surface">📅 {event.date} • ⏰ {event.time}</p>
                      <p className="font-body text-sm text-on-surface mt-3">{event.description}</p>
                    </div>
                    <div className="border-l-4 border-black pl-4">
                      <p className="font-label font-black text-xs uppercase mb-2 text-on-surface">Event Details</p>
                      <p className="font-body text-sm text-on-surface">Type: {event.type === 'solo' ? '👤 Solo' : '👥 Team'}</p>
                      <p className="font-body text-sm text-on-surface">Capacity: {event.capacity}</p>
                    </div>
                    <div className="flex gap-2 md:flex-col">
                      <button
                        onClick={() => handleApprove(event.eventId)}
                        className="flex-1 bg-secondary-container text-black font-headline font-black py-3 px-4 border-4 border-black uppercase hover:-translate-y-1 transition-all"
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={() => setRejectingEventId(event.eventId)}
                        className="flex-1 bg-error-container text-black font-headline font-black py-3 px-4 border-4 border-black uppercase hover:-translate-y-1 transition-all"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  </div>

                  {/* Reject Reason Form */}
                  {rejectingEventId === event.eventId && (
                    <div className="pt-4 border-t-4 border-black">
                      <textarea
                        placeholder="Reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full px-4 py-3 border-3 border-black focus:border-black focus:outline-none bg-white font-body text-sm"
                        rows="2"
                      />
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleReject(event.eventId)}
                          className="flex-1 bg-error-container text-black font-headline font-black py-2 px-4 border-3 border-black uppercase text-sm hover:-translate-y-1 transition-all"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          onClick={() => {
                            setRejectingEventId(null);
                            setRejectReason('');
                          }}
                          className="flex-1 bg-surface border-3 border-black font-headline font-black py-2 px-4 uppercase text-sm hover:-translate-y-1 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-surface-container border-4 border-black">
                <p className="font-headline font-black text-xl uppercase text-on-surface">✅ All Clear! No Pending Approvals</p>
              </div>
            )}
          </div>
        )}

        {/* Approved Events Tab */}
        {activeTab === 'approved' && (
          <div className="space-y-4">
            {approvedEvents.length > 0 ? (
              approvedEvents.map(event => (
                <div key={event.eventId} className="bg-secondary-container border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-headline font-black text-2xl uppercase text-black">{event.name}</h3>
                      <p className="font-body text-sm text-on-surface mt-2">📍 {event.location} • 📅 {event.date}</p>
                      <div className="mt-3 border-t-2 border-black pt-3">
                        <p className="font-label font-black text-sm uppercase text-on-surface">{event.registeredCount}/{event.capacity} Registered</p>
                      </div>
                    </div>
                    <div className="bg-white border-4 border-black px-6 py-4 text-center">
                      <p className="font-headline font-black text-sm uppercase text-black">✓ Approved</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-surface-container border-4 border-black">
                <p className="font-headline font-black text-xl uppercase text-on-surface">🎁 No Approved Events Yet</p>
              </div>
            )}
          </div>
        )}

        {/* Rejected Events Tab */}
        {activeTab === 'rejected' && (
          <div className="space-y-4">
            {rejectedEvents.length > 0 ? (
              rejectedEvents.map(event => (
                <div key={event.eventId} className="bg-error-container border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-headline font-black text-2xl uppercase text-black">{event.name}</h3>
                      <p className="font-body text-sm text-on-surface mt-2">📍 {event.location} • 📅 {event.date}</p>
                      {event.rejectionReason && (
                        <div className="mt-3 border-t-2 border-black pt-3">
                          <p className="font-label font-black text-xs uppercase text-black mb-1">Reason:</p>
                          <p className="font-body text-sm text-on-surface">{event.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                    <div className="bg-white border-4 border-black px-6 py-4 text-center">
                      <p className="font-headline font-black text-sm uppercase text-black">✗ Rejected</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-surface-container border-4 border-black">
                <p className="font-headline font-black text-xl uppercase text-on-surface">🎉 No Rejection - Everything's Good!</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div>
            <div className="mb-8">
              <h2 className="font-headline font-black text-4xl uppercase text-black mb-4 border-b-4 border-black pb-4">
                📅 All Events Calendar
              </h2>
              <p className="font-body text-on-surface mb-6">View all events across the campus on a calendar. Click on a date to see events scheduled for that day, regardless of status. Use the delete button to remove events.</p>
            </div>
            <Calendar 
              events={events} 
              highlightColor="bg-tertiary-container"
              isAdmin={true}
              onDeleteEvent={handleDeleteEvent}
            />
          </div>
        )}
      </div>
    </div>
  );
}
