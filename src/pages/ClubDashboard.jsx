import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { useUI } from '../hooks/useUI';
import { EVENT_STATUS, DIFFICULTY_LEVELS } from '../utils/constants';
import Calendar from '../components/Calendar';

export default function ClubDashboard() {
  const { user } = useAuth();
  const { events, createEvent, deleteEvent } = useEvents();
  const { showToast } = useUI();
  const [activeTab, setActiveTab] = useState('create');
  const [formData, setFormData] = useState({
    name: '',
    type: 'solo',
    location: '',
    date: '',
    time: '',
    endTime: '',
    description: '',
    capacity: '50',
    image: null,
    imagePreview: null,
    difficulty: 'beginner',
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);

  const clubEvents = events.filter(e => e.clubId === user?.uid);

  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      // Handle file input
      const file = files[0];
      if (file) {
        // Validate file size (max 5MB)
        const maxSizeInMB = 5;
        const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
        
        if (file.size > maxSizeInBytes) {
          setFormErrors(prev => ({ 
            ...prev, 
            image: `File size must be less than ${maxSizeInMB}MB (Current: ${(file.size / 1024 / 1024).toFixed(2)}MB)` 
          }));
          return;
        }
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          setFormErrors(prev => ({ 
            ...prev, 
            image: 'Only JPG, PNG, GIF, and WebP images are allowed' 
          }));
          return;
        }
        
        // Create a preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({ 
            ...prev, 
            image: file,
            imagePreview: reader.result 
          }));
          // Clear image error when valid file is selected
          if (formErrors.image) {
            setFormErrors(prev => ({ ...prev, image: '' }));
          }
        };
        reader.readAsDataURL(file);
      }
    } else {
      // Handle regular input
      setFormData(prev => ({ ...prev, [name]: value }));
      // Clear error for this field when user starts typing
      if (formErrors[name]) {
        setFormErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  // Validate 24-hour advance requirement
  const validateEventDate = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return null;
    
    try {
      const eventDateTime = new Date(`${dateStr}T${timeStr}`);
      const now = new Date();
      const minDateTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      if (eventDateTime < minDateTime) {
        return 'Events must be scheduled at least 24 hours in advance';
      }
      return null;
    } catch (error) {
      return 'Invalid date or time format';
    }
  };

  // Check for time conflicts with existing events at same location
  const checkTimeConflict = () => {
    if (!formData.location || !formData.date || !formData.time || !formData.endTime) {
      return null; // Can't check if fields are missing
    }

    const newStartTime = formData.time; // HH:MM format
    const newEndTime = formData.endTime; // HH:MM format
    const newDate = formData.date; // YYYY-MM-DD format

    // Check against all existing events
    const conflicts = [];
    for (const event of events) {
      // Only check approved events (pending events not confirmed)
      if (event.status !== EVENT_STATUS.APPROVED && event.status !== EVENT_STATUS.PENDING) {
        continue;
      }

      // Same location and date
      if (event.location === formData.location && event.date === newDate) {
        // Check time overlap
        const existingStart = event.time; // HH:MM format
        const existingEnd = event.endTime; // HH:MM format

        // Time overlap check: (newStart < existingEnd && newEnd > existingStart)
        if (
          (newStartTime < existingEnd && newEndTime > existingStart) ||
          (existingStart < newEndTime && existingEnd > newStartTime)
        ) {
          conflicts.push({
            name: event.name,
            time: `${event.time} - ${event.endTime}`,
          });
        }
      }
    }

    if (conflicts.length > 0) {
      const conflictText = conflicts.map(c => `${c.name} (${c.time})`).join(', ');
      return `Time slot conflicts with existing event(s): ${conflictText}`;
    }

    return null;
  };

  // Validate entire form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) errors.name = 'Event name is required';
    if (!formData.location.trim()) errors.location = 'Location is required';
    if (!formData.date) errors.date = 'Date is required';
    if (!formData.time) errors.time = 'Start time is required';
    if (!formData.endTime) errors.endTime = 'End time is required';
    if (!formData.description.trim()) errors.description = 'Description is required';
    
    // Validate 24-hour advance
    const dateError = validateEventDate(formData.date, formData.time);
    if (dateError) {
      errors.date = dateError;
    }
    
    // Validate end time is after start time
    if (formData.time && formData.endTime && formData.time >= formData.endTime) {
      errors.endTime = 'End time must be after start time';
    }

    // Validate no time conflicts at same location
    const conflictError = checkTimeConflict();
    if (conflictError) {
      errors.time = conflictError;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('⚠️ Please fix the errors in the form', 'warning');
      return;
    }

    // Check for image validation errors
    if (formErrors.image) {
      showToast(`⚠️ ${formErrors.image}`, 'warning');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Generate filename from image file if present
      let imageName = '';
      if (formData.image && formData.image instanceof File) {
        // Store only filename, not full base64 data
        imageName = `${Date.now()}_${formData.image.name}`;
      }
      
      const result = await createEvent({
        ...formData,
        image: imageName, // Store only filename reference
        clubId: user.uid,
        capacity: parseInt(formData.capacity),
        difficulty: formData.difficulty,
        status: EVENT_STATUS.PENDING,
        registeredCount: 0,
      });
      
      if (result.success) {
        showToast('✨ Event created! Awaiting admin approval', 'success');
        setFormData({
          name: '',
          type: 'solo',
          location: '',
          date: '',
          time: '',
          endTime: '',
          description: '',
          capacity: '50',
          image: null,
          imagePreview: null,
          difficulty: 'beginner',
        });
        setFormErrors({});
      } else {
        showToast(result.message || '❌ Failed to create event', 'error');
        if (result.message.includes('24 hours')) {
          setFormErrors({ date: result.message });
        }
      }
    } catch (error) {
      console.error('Event creation error:', error);
      const errorMessage = error.message || 'An error occurred while creating the event';
      showToast(`❌ ${errorMessage}`, 'error');
      
      // Set appropriate field error based on error message
      if (errorMessage.includes('24 hours')) {
        setFormErrors({ date: errorMessage });
      } else if (errorMessage.includes('Time conflict')) {
        setFormErrors({ time: errorMessage });
      } else if (errorMessage.includes('size')) {
        setFormErrors({ image: errorMessage });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    try {
      console.log('🗑️ Delete button clicked for event:', eventId);
      const result = await deleteEvent(eventId);
      console.log('✅ Delete result:', result);
      showToast('🗑️ Event deleted successfully', 'success');
      setDeletingEventId(null);
    } catch (error) {
      console.error('❌ Error deleting event:', error);
      const errorMsg = error?.message || '❌ Failed to delete event';
      showToast(errorMsg, 'error');
    }
  };

  const getStatusClass = (status) => {
    switch(status) {
      case EVENT_STATUS.APPROVED: return 'bg-secondary-container border-secondary text-black';
      case EVENT_STATUS.PENDING: return 'bg-yellow-300 border-black text-black';
      case EVENT_STATUS.REJECTED: return 'bg-error-container border-error text-black';
      case EVENT_STATUS.CANCELLED: return 'bg-surface border-black text-on-surface';
      default: return 'bg-surface border-black text-on-surface';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Neo-brutalism */}
      <div className="bg-secondary-container border-b-4 border-black px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-headline font-black text-6xl uppercase text-black mb-2 italic">
            👥 Club HQ
          </h1>
          <p className="font-body text-xl text-black">Build, Create, Engage. Design the events your club dreams of.</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation - Neo-brutalism */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 ${
              activeTab === 'create'
                ? 'bg-primary-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            ➕ Create Event
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 ${
              activeTab === 'events'
                ? 'bg-primary-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            📋 My Events ({clubEvents.length})
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 font-headline font-black uppercase transition-all border-4 ${
              activeTab === 'calendar'
                ? 'bg-primary-container border-black text-black shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                : 'bg-white border-black text-black hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
            }`}
          >
            📅 Event Calendar
          </button>
        </div>

        {/* Create Event Form - Neo-brutalism */}
        {activeTab === 'create' && (
          <div className="bg-white border-4 border-black p-8 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            <h2 className="font-headline font-black text-4xl uppercase text-black mb-8 border-b-4 border-black pb-4">
              Create New Event
            </h2>
            <form onSubmit={handleCreateEvent} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Event Name */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">
                    Event Name * {formErrors.name && <span className="text-error-container">⚠️</span>}
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border-3 focus:outline-none bg-white font-body ${
                      formErrors.name ? 'border-error-container' : 'border-black focus:border-primary'
                    }`}
                    placeholder="Enter event name"
                  />
                  {formErrors.name && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.name}</p>}
                </div>

                {/* Event Type */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">Event Type *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                  >
                    <option value="solo">👤 Solo Event</option>
                    <option value="team">👥 Team Event</option>
                  </select>
                </div>

                {/* Difficulty Level */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">Difficulty Level *</label>
                  <select
                    name="difficulty"
                    value={formData.difficulty}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                  >
                    <option value={DIFFICULTY_LEVELS.BEGINNER}>🟢 Beginner</option>
                    <option value={DIFFICULTY_LEVELS.INTERMEDIATE}>🟡 Intermediate</option>
                    <option value={DIFFICULTY_LEVELS.ADVANCED}>🔴 Advanced</option>
                    <option value={DIFFICULTY_LEVELS.EXPERT}>⚫ Expert</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">
                    Location * {formErrors.location && <span className="text-error-container">⚠️</span>}
                  </label>
                  <select
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border-3 focus:outline-none bg-white font-body ${
                      formErrors.location ? 'border-error-container' : 'border-black focus:border-primary'
                    }`}
                  >
                    <option value="">Select a location</option>
                    <option value="Main Auditorium">🎭 Main Auditorium</option>
                    <option value="Seminar Hall">📚 Seminar Hall</option>
                    <option value="Conference Room A">💼 Conference Room A</option>
                    <option value="Conference Room B">💼 Conference Room B</option>
                    <option value="Open Ground">⚽ Open Ground</option>
                    <option value="Cafeteria">🍽️ Cafeteria</option>
                    <option value="Library">📖 Library</option>
                    <option value="Student Center">👥 Student Center</option>
                    <option value="Gymnasium">🏋️ Gymnasium</option>
                    <option value="Sports Complex">🏟️ Sports Complex</option>
                    <option value="Computer Lab">💻 Computer Lab</option>
                    <option value="Science Lab">🔬 Science Lab</option>
                    <option value="Art Studio">🎨 Art Studio</option>
                    <option value="Music Room">🎵 Music Room</option>
                    <option value="Parking Lot">🅿️ Parking Lot</option>
                  </select>
                  {formErrors.location && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.location}</p>}
                </div>

                {/* Capacity */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">Capacity *</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    className="w-full px-4 py-3 border-3 border-black focus:border-primary focus:outline-none bg-white font-body"
                    placeholder="50"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">
                    Date * {formErrors.date && <span className="text-error-container">⚠️</span>}
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                    min={new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    className={`w-full px-4 py-3 border-3 focus:outline-none bg-white font-body ${
                      formErrors.date ? 'border-error-container' : 'border-black focus:border-primary'
                    }`}
                  />
                  {formErrors.date && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.date}</p>}
                </div>

                {/* Start Time */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">
                    Start Time * {formErrors.time && <span className="text-error-container">⚠️</span>}
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border-3 focus:outline-none bg-white font-body ${
                      formErrors.time ? 'border-error-container' : 'border-black focus:border-primary'
                    }`}
                  />
                  {formErrors.time && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.time}</p>}
                </div>

                {/* End Time */}
                <div>
                  <label className="block font-label font-black text-sm uppercase text-black mb-2">
                    End Time * {formErrors.endTime && <span className="text-error-container">⚠️</span>}
                  </label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border-3 focus:outline-none bg-white font-body ${
                      formErrors.endTime ? 'border-error-container' : 'border-black focus:border-primary'
                    }`}
                  />
                  {formErrors.endTime && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.endTime}</p>}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-label font-black text-sm uppercase text-black mb-2">
                  Description * {formErrors.description && <span className="text-error-container">⚠️</span>}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                  rows="4"
                  className={`w-full px-4 py-3 border-3 focus:outline-none bg-white font-body ${
                    formErrors.description ? 'border-error-container' : 'border-black focus:border-primary'
                  }`}
                  placeholder="Describe your event..."
                />
                {formErrors.description && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.description}</p>}
              </div>

              {/* Event Poster */}
              <div>
                <label className="block font-label font-black text-sm uppercase text-black mb-2">
                  📸 Event Poster (Optional) {formErrors.image && <span className="text-error-container">⚠️</span>}
                </label>
                <div className="border-3 border-dashed border-black p-6 bg-white rounded-sm hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleInputChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-2 file:border-black file:text-sm file:font-bold file:bg-primary-container file:text-black hover:file:bg-opacity-90 cursor-pointer"
                  />
                  <p className="font-label text-xs text-gray-600 mt-2">Accepted formats: JPG, PNG, GIF, WebP. Max 5MB</p>
                </div>
                {formErrors.image && <p className="text-error-container font-body text-sm mt-1">ℹ️ {formErrors.image}</p>}
                {formData.imagePreview && (
                  <div className="mt-4 relative">
                    <img 
                      src={formData.imagePreview} 
                      alt="Event poster preview" 
                      className="w-full h-48 object-cover border-3 border-black"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image: null, imagePreview: null }))}
                      className="absolute top-2 right-2 bg-error text-white px-3 py-1 font-label font-bold border-2 border-black text-sm"
                    >
                      ✕ Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 text-black font-headline font-black py-4 px-6 border-4 border-black uppercase hover:-translate-y-1 transition-all ${
                    isSubmitting 
                      ? 'bg-gray-300 cursor-not-allowed opacity-60' 
                      : 'bg-primary-container hover:shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  }`}
                >
                  {isSubmitting ? '⏳ Creating...' : '🚀 Create Event'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* My Events Tab */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {clubEvents.length > 0 ? (
              clubEvents.map(event => (
                <div key={event.eventId} className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="font-headline font-black text-2xl uppercase text-black">{event.name}</h3>
                        <span className={`px-4 py-2 border-3 border-black font-label font-black text-sm uppercase ${getStatusClass(event.status)}`}>
                          {event.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="inline-block px-3 py-1 border-2 border-black font-label font-bold text-xs uppercase bg-primary-container">
                          {event.difficulty === DIFFICULTY_LEVELS.BEGINNER && '🟢 Beginner'}
                          {event.difficulty === DIFFICULTY_LEVELS.INTERMEDIATE && '🟡 Intermediate'}
                          {event.difficulty === DIFFICULTY_LEVELS.ADVANCED && '🔴 Advanced'}
                          {event.difficulty === DIFFICULTY_LEVELS.EXPERT && '⚫ Expert'}
                        </span>
                      </div>
                      <p className="font-body text-sm text-on-surface">📍 {event.location}</p>
                      <p className="font-body text-sm text-on-surface">📅 {event.date} • ⏰ {event.time}</p>
                      <p className="font-body text-sm text-on-surface mt-3">{event.description}</p>
                    </div>
                    <div className="text-right border-l-4 border-black pl-4 flex flex-col gap-2">
                      <div>
                        <p className="font-headline font-black text-2xl text-black">
                          {event.registeredCount}/{event.capacity}
                        </p>
                        <p className="font-label font-bold text-xs uppercase text-on-surface mt-2">Registered</p>
                        <div className="w-24 bg-surface border-2 border-black h-6 mt-2">
                          <div 
                            className="h-full bg-primary-container border-r-4 border-black" 
                            style={{ width: `${(event.registeredCount / event.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {/* Delete Button - only for pending events */}
                      {event.status === EVENT_STATUS.PENDING && (
                        <div className="mt-3 pt-3 border-t-2 border-black">
                          {deletingEventId === event.eventId ? (
                            <div className="flex gap-1 flex-col">
                              <p className="text-xs font-body text-center mb-1">Confirm delete?</p>
                              <button
                                onClick={() => handleDeleteEvent(event.eventId)}
                                className="px-2 py-1 bg-error-container border-2 border-black font-label font-black text-xs uppercase hover:-translate-y-0.5 transition-all"
                              >
                                Yes, Delete
                              </button>
                              <button
                                onClick={() => setDeletingEventId(null)}
                                className="px-2 py-1 bg-surface border-2 border-black font-label font-black text-xs uppercase hover:-translate-y-0.5 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingEventId(event.eventId)}
                              className="w-full px-2 py-1 bg-error-container border-2 border-black font-label font-black text-xs uppercase hover:-translate-y-0.5 transition-all"
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-surface-container border-4 border-black">
                <p className="font-headline font-black text-xl uppercase text-on-surface">🎭 No Events Created Yet - Start Building!</p>
              </div>
            )}
          </div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <div>
            <div className="mb-8">
              <h2 className="font-headline font-black text-4xl uppercase text-black mb-4 border-b-4 border-black pb-4">
                📅 Your Club Events Calendar
              </h2>
              <p className="font-body text-on-surface mb-6">View all your club's events on a calendar. Click on a date to see events scheduled for that day.</p>
            </div>
            <Calendar 
              events={clubEvents} 
              highlightColor="bg-secondary-container"
            />
          </div>
        )}
      </div>
    </div>
  );
}
