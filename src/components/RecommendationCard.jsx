/**
 * RecommendationCard - Displays individual event recommendation with Tailwind CSS
 * Neo-brutalism design
 */

import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const RecommendationCard = ({
  event,
  score,
  reasoning,
  onRegister,
  onViewDetails,
  showScore = true,
  compact = false
}) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!event) return null;

  // Format date
  const formatDate = (date) => {
    if (!date) return 'No date';
    const eventDate = new Date(date);
    return eventDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-brand-success text-white';
    if (score >= 60) return 'bg-brand-warning text-brand-black';
    return 'bg-brand-error text-white';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent match';
    if (score >= 60) return 'Good match';
    return 'Fair match';
  };

  const handleRegister = () => {
    if (onRegister) {
      onRegister(event.id);
    }
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(event.id);
    } else {
      setDetailsOpen(true);
    }
  };

  if (compact) {
    return (
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
        <div className="space-y-3">
          <div className="flex justify-between items-start gap-3">
            <h3 className="font-bold text-lg text-brand-black">{event.name}</h3>
            {showScore && score && (
              <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${getScoreColor(score)}`}>
                {Math.round(score)}% match
              </span>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span className="text-gray-700">{formatDate(event.eventDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>📍</span>
              <span className="text-gray-700">{event.location || 'TBA'}</span>
            </div>
          </div>

          {reasoning && (
            <p className="text-xs text-gray-600 italic">{reasoning}</p>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={handleRegister}
            className="flex-1 bg-brand-accent text-white py-2 rounded-lg font-semibold text-sm hover:shadow-md transition-all"
          >
            Register
          </button>
          <button
            onClick={handleViewDetails}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-semibold text-sm hover:border-brand-accent transition-all"
          >
            Details
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border-2 border-gray-200 rounded-3xl overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
        {/* Header with Score */}
        <div className="bg-gradient-to-r from-brand-accent to-brand-secondary p-6 text-white flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-2xl font-bold m-0">{event.name}</h2>
            <p className="text-sm opacity-90 m-0">{event.clubName || 'College Event'}</p>
          </div>
          <button
            onClick={() => setLiked(!liked)}
            className="text-3xl hover:scale-125 transition-transform"
          >
            {liked ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Score Bar */}
        {score && (
          <div className="px-6 pt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-accent to-brand-secondary transition-all duration-500"
                style={{ width: `${score}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs font-bold text-gray-600">{getScoreLabel(score)}</span>
              <span className="text-lg font-bold text-brand-accent">{Math.round(score)}%</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">📅 Date</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {formatDate(event.eventDate)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">📍 Location</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {event.location || 'TBA'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">👥 Attendees</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {event.registrationCount || 0} joined
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">📊 Type</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {event.type === 'team' ? '👥 Team' : '👤 Solo'}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-2">About this event</h4>
            <p className="text-sm text-gray-700 leading-relaxed">
              {event.description || 'No description available'}
            </p>
          </div>

          {/* Why Recommended */}
          {reasoning && (
            <div className="bg-brand-success bg-opacity-10 border-2 border-brand-success rounded-2xl p-4">
              <h4 className="font-bold text-brand-success mb-2">💡 Why recommended</h4>
              <p className="text-sm text-brand-success opacity-90">{reasoning}</p>
            </div>
          )}

          {/* Expandable Details */}
          {expanded && (
            <div className="space-y-3 pt-3 border-t-2 border-gray-200">
              {event.skillLevel && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Skill Level</p>
                  <p className="text-sm font-semibold text-gray-900">{event.skillLevel}</p>
                </div>
              )}
              {event.registrationDeadline && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Registration Deadline</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(event.registrationDeadline)}
                  </p>
                </div>
              )}
              {event.maxCapacity && (
                <div>
                  <p className="text-xs font-bold text-gray-600 uppercase">Capacity</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {event.registrationCount || 0} / {event.maxCapacity} registered
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex gap-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-gray-700 font-semibold text-sm hover:bg-gray-200 py-2 rounded-lg transition-all"
          >
            {expanded ? '← Less details' : 'More details →'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleViewDetails}
              className="border-2 border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-semibold text-sm hover:border-brand-accent hover:text-brand-accent transition-all"
            >
              View
            </button>
            <button
              onClick={handleRegister}
              className="bg-gradient-to-r from-brand-accent to-brand-secondary text-white px-6 py-2 rounded-lg font-semibold text-sm hover:shadow-lg transition-all"
            >
              Register
            </button>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-brand-accent to-brand-secondary text-white p-6">
              <h3 className="text-2xl font-bold m-0">{event.name}</h3>
            </div>
            <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <h4 className="font-bold text-gray-900 mb-2">About this event</h4>
                <p className="text-gray-700 text-sm">
                  {event.description || 'No description available'}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900">Event Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date & Time:</span>
                    <span className="font-semibold text-gray-900">
                      {formatDate(event.eventDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-semibold text-gray-900">
                      {event.location || 'TBA'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Event Type:</span>
                    <span className="font-semibold text-gray-900">
                      {event.type === 'team' ? 'Team Event' : 'Solo Event'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participants:</span>
                    <span className="font-semibold text-gray-900">
                      {event.registrationCount || 0} / {event.maxCapacity || 'Unlimited'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t-2 border-gray-200 flex gap-3">
              <button
                onClick={() => setDetailsOpen(false)}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleRegister();
                  setDetailsOpen(false);
                }}
                className="flex-1 bg-gradient-to-r from-brand-accent to-brand-secondary text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all"
              >
                Register Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecommendationCard;
