import React, { useState } from 'react';
import { EVENT_STATUS } from '../utils/constants';

export default function Calendar({ 
  events = [], 
  onDateClick = null, 
  highlightColor = 'bg-primary-container',
  isAdmin = false,
  onDeleteEvent = null 
}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [deletingEventId, setDeletingEventId] = useState(null);

  // Filter only approved events for display
  const approvedEvents = events.filter(e => e.status === EVENT_STATUS.APPROVED);
  const displayEvents = isAdmin ? events : approvedEvents;

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateString = (date) => {
    return date.toISOString().split('T')[0];
  };

  const getEventsForDate = (date) => {
    const dateStr = formatDateString(date);
    return displayEvents.filter(event => event.date === dateStr);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const selectedDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(selectedDay);
    if (onDateClick) {
      onDateClick(selectedDay);
    }
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-6 border-b-4 border-black pb-4">
        <button
          onClick={prevMonth}
          className="px-4 py-2 border-3 border-black font-headline font-black uppercase hover:bg-primary-container transition-all hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]"
        >
          ◀ Prev
        </button>
        <h2 className="font-headline font-black text-2xl uppercase">{monthName}</h2>
        <button
          onClick={nextMonth}
          className="px-4 py-2 border-3 border-black font-headline font-black uppercase hover:bg-primary-container transition-all hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]"
        >
          Next ▶
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div
            key={day}
            className="text-center font-label font-black text-xs uppercase border-2 border-black py-2 bg-secondary-container"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map((day, idx) => {
          const date = day ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day) : null;
          const dateStr = date ? formatDateString(date) : null;
          const dayEvents = day ? getEventsForDate(date) : [];
          const isSelected = selectedDate && selectedDate.toDateString() === date?.toDateString();
          const isToday = date && date.toDateString() === new Date().toDateString();

          return (
            <div
              key={idx}
              onClick={() => day && handleDateClick(day)}
              className={`min-h-24 border-2 border-black p-2 text-center cursor-pointer transition-all ${
                !day
                  ? 'bg-surface'
                  : isSelected
                  ? `${highlightColor} border-4`
                  : isToday
                  ? 'bg-yellow-200'
                  : dayEvents.length > 0
                  ? 'bg-primary-container/50'
                  : 'bg-white hover:bg-primary-container/30'
              } ${dayEvents.length > 0 ? 'hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]' : ''}`}
            >
              {day && (
                <>
                  <div className="font-headline font-black text-sm mb-1">{day}</div>
                  {dayEvents.length > 0 && (
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map((event, i) => (
                        <div
                          key={i}
                          className="text-xs font-label font-bold bg-black text-white px-1 py-0.5 truncate border-1 border-black"
                        >
                          {event.name.substring(0, 10)}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs font-label font-bold text-on-surface">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Events */}
      {selectedDate && selectedDateEvents.length > 0 && (
        <div className="border-t-4 border-black pt-6">
          <h3 className="font-headline font-black text-lg uppercase mb-4 border-b-2 border-black pb-2">
            📅 Events on {selectedDate.toLocaleDateString()}
          </h3>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {selectedDateEvents.map((event, idx) => (
              <div
                key={idx}
                className="p-4 border-2 border-black bg-surface-container hover:bg-primary-container/20 transition-all"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-headline font-black text-sm uppercase mb-1">{event.name}</h4>
                    <p className="text-xs font-body text-on-surface">📍 {event.location}</p>
                    <p className="text-xs font-body text-on-surface">⏰ {event.time}</p>
                    {isAdmin && event.status && (
                      <p className="text-xs font-body font-bold mt-2">Status: {event.status}</p>
                    )}
                  </div>
                  {isAdmin && onDeleteEvent && (
                    <div className="flex gap-1">
                      {deletingEventId === event.eventId ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              onDeleteEvent(event.eventId);
                              setDeletingEventId(null);
                            }}
                            className="px-2 py-1 bg-error-container border-2 border-black font-label font-black text-xs uppercase hover:-translate-y-0.5 transition-all"
                          >
                            Confirm
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
                          className="px-3 py-1 bg-error-container border-2 border-black font-label font-black text-xs uppercase hover:-translate-y-0.5 transition-all"
                          title="Remove event from calendar"
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
