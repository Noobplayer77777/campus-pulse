import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { ROUTES, EVENT_STATUS } from '../utils/constants';
import Footer from '../components/Footer';

export default function Home() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { events, loading: eventsLoading, fetchEvents } = useEvents();
  const [happeningNowEvents, setHappeningNowEvents] = useState([]);
  const [trendingEvent, setTrendingEvent] = useState(null);

  // Fetch events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        await fetchEvents({ status: EVENT_STATUS.APPROVED, dateRange: 'future' });
      } catch (error) {
        console.error('Error loading events:', error);
      }
    };
    loadEvents();
  }, [fetchEvents]);

  // Filter and limit events for "Happening Now" section
  useEffect(() => {
    if (events && events.length > 0) {
      // Take first 3 events for display
      setHappeningNowEvents(events.slice(0, 3));
      
      // Find event with highest registration for "Trending Now"
      const topEvent = events.reduce((max, event) => 
        (event.registeredCount || 0) > (max.registeredCount || 0) ? event : max
      );
      setTrendingEvent(topEvent);
    }
  }, [events]);

  const handleViewEvent = (eventId) => {
    if (isAuthenticated) {
      // Navigate to dashboard and pass event ID for viewing
      navigate(ROUTES.STUDENT_DASHBOARD, { state: { highlightEventId: eventId } });
    } else {
      // Redirect to login page
      navigate(ROUTES.AUTH);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body">
      {/* Hero Section */}
      <main className="pt-20 sm:pt-24">
        <section className="relative min-h-screen sm:min-h-[870px] flex items-center px-3 sm:px-6 md:px-12 py-12 sm:py-0 overflow-hidden border-b-2 sm:border-b-4 border-black bg-surface z-0">
          <div className="z-20 max-w-5xl relative w-full">
            <h1 className="font-headline font-black text-4xl sm:text-6xl md:text-8xl leading-tight sm:leading-none uppercase tracking-tighter mb-4 sm:mb-6">
              FEEL THE <br />
              <span className="text-primary bg-black px-2 sm:px-4 py-1 sm:py-2 inline-block -rotate-1">CAMPUS PULSE</span>
            </h1>
            <p className="font-body text-sm sm:text-xl md:text-2xl font-medium max-w-2xl mb-6 sm:mb-10 text-on-surface">
              Where campus life comes alive. Explore events, join clubs, make memories. Your next big moment awaits.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6">
              <button
                onClick={() => navigate('/student-dashboard')}
                className="bg-primary-container text-black font-headline font-black text-xs sm:text-lg md:text-xl px-4 sm:px-10 py-3 sm:py-5 border-2 sm:border-4 border-black neo-shadow-lg neo-hover transition-all flex items-center justify-center gap-2 sm:gap-3 min-h-[44px]"
              >
                🎉 Discover Events
                <span className="material-symbols-outlined text-sm sm:text-base">arrow_forward</span>
              </button>
              <button className="bg-secondary-container text-on-secondary-container font-headline font-black text-xs sm:text-lg md:text-xl px-4 sm:px-10 py-3 sm:py-5 border-2 sm:border-4 border-black neo-shadow-lg neo-hover transition-all flex items-center justify-center gap-2 sm:gap-3 min-h-[44px]">
                🎭 Browse Clubs
                <span className="material-symbols-outlined text-sm sm:text-base">groups</span>
              </button>
            </div>
          </div>

          {/* Decorative Element */}
          <div className="absolute right-[-10%] top-[20%] w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-secondary opacity-20 blur-[80px] sm:blur-[120px] rounded-full z-0 pointer-events-none"></div>
          <div className="absolute right-2 sm:right-6 md:right-12 bottom-2 sm:bottom-6 md:bottom-12 hidden lg:block z-30">
            {trendingEvent ? (
              <div className="w-56 md:w-64 border-3 md:border-4 border-black bg-white neo-shadow-xl -rotate-6 p-3 md:p-4 flex flex-col justify-between">
                <div>
                  <div className="font-label text-xs uppercase opacity-60 mb-2">🌟 Trending Now</div>
                  <div className="font-headline font-black text-lg md:text-2xl leading-tight line-clamp-3 mb-4">{trendingEvent.name}</div>
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-label font-bold text-xs">Capacity</span>
                      <span className="font-label font-bold text-xs">{trendingEvent.registeredCount || 0}/{trendingEvent.capacity || 50}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-300 border-2 border-black relative overflow-hidden">
                      {(() => {
                        const capacity = trendingEvent.capacity || 50;
                        const registered = trendingEvent.registeredCount || 0;
                        const percentage = Math.min((registered / capacity) * 100, 100);
                        let barColor = 'bg-green-500';
                        
                        if (percentage >= 90) {
                          barColor = 'bg-red-500';
                        } else if (percentage >= 70) {
                          barColor = 'bg-yellow-500';
                        }
                        
                        return (
                          <div 
                            className={`h-full ${barColor} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="bg-primary-container p-2 text-center font-label font-bold text-xs border-2 border-black flex-1">
                      {trendingEvent.date}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleViewEvent(trendingEvent.eventId)}
                  className="bg-black text-white w-full mt-4 px-3 py-2 font-headline font-bold text-xs neo-shadow-md hover:-translate-y-1 border-2 border-black">
                  👁️ VIEW NOW
                </button>
              </div>
            ) : (
              <div className="w-56 md:w-64 h-56 md:h-64 border-4 border-black bg-white neo-shadow-xl -rotate-6 p-4 flex flex-col justify-between animate-pulse">
                <div className="font-label text-xs uppercase opacity-60">🌟 Trending Now</div>
                <div className="bg-gray-200 h-12 rounded"></div>
                <div className="bg-primary-container p-2 text-center font-label font-bold border-2 border-black">
                  Loading...
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Featured Events Grid */}
        <section className="py-12 sm:py-24 px-3 sm:px-6 md:px-12 bg-surface-container-low">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-8 sm:mb-16 gap-4 sm:gap-0">
            <div>
              <h2 className="font-headline font-black text-3xl sm:text-5xl uppercase tracking-tight">🔥 Happening Now</h2>
              <div className="h-1 sm:h-2 w-20 sm:w-32 bg-primary-container border-2 border-black mt-2"></div>
            </div>
            <Link to="/student-dashboard" className="font-label font-bold text-xs sm:text-base flex items-center gap-2 hover:underline">
              Explore All 🚀 <span className="material-symbols-outlined text-sm">east</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-10">
            {eventsLoading ? (
              <div className="col-span-full text-center py-12">
                <p className="font-headline font-black text-lg sm:text-2xl">Loading events...</p>
              </div>
            ) : happeningNowEvents && happeningNowEvents.length > 0 ? (
              happeningNowEvents.map((event, idx) => (
                <div key={event.eventId} className="group bg-surface-container-lowest border-2 sm:border-4 border-black neo-shadow-xl neo-hover transition-all overflow-hidden relative">
                  {idx === 1 && (
                    <div className="absolute top-0 right-0 z-20 bg-secondary text-white font-label font-bold px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm border-b-3 sm:border-b-4 border-l-3 sm:border-l-4 border-black">
                      HOT PICK
                    </div>
                  )}
                  <div className="h-40 sm:h-64 relative overflow-hidden border-b-2 sm:border-b-4 border-black">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={event.image || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop'}
                      alt={event.name}
                    />
                    <div className="absolute top-2 sm:top-4 left-2 sm:left-4 bg-primary-container px-2 sm:px-3 py-1 font-label font-bold text-xs sm:text-sm border-2 border-black neo-shadow-md">
                      {event.type?.toUpperCase() || 'EVENT'}
                    </div>
                  </div>
                  <div className="p-3 sm:p-6">
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <h3 className="font-headline font-black text-base sm:text-2xl leading-tight">{event.name}</h3>
                    </div>
                    <p className="font-body text-on-surface-variant mb-4 line-clamp-2 text-xs sm:text-base">{event.description}</p>
                    
                    {/* Capacity Bar */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-label font-bold text-xs sm:text-sm">👥 Capacity</span>
                        <span className="font-label font-bold text-xs sm:text-sm">{event.registeredCount || 0}/{event.capacity || 50}</span>
                      </div>
                      <div className="w-full h-2 sm:h-3 bg-gray-300 border-2 border-black relative overflow-hidden">
                        {(() => {
                          const capacity = event.capacity || 50;
                          const registered = event.registeredCount || 0;
                          const percentage = Math.min((registered / capacity) * 100, 100);
                          let barColor = 'bg-green-500';
                          
                          if (percentage >= 90) {
                            barColor = 'bg-red-500';
                          } else if (percentage >= 70) {
                            barColor = 'bg-yellow-500';
                          }
                          
                          return (
                            <div 
                              className={`h-full ${barColor} transition-all duration-300`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t-2 border-black pt-3 sm:pt-4 gap-3 sm:gap-0">
                      <span className="font-label font-bold flex items-center gap-1 text-xs sm:text-base">
                        <span className="material-symbols-outlined text-sm sm:text-base">calendar_today</span> {event.date}
                      </span>
                      <button 
                        onClick={() => handleViewEvent(event.eventId)}
                        className="bg-black text-white px-3 sm:px-4 py-2 font-headline font-bold text-xs sm:text-sm neo-shadow-md hover:-translate-y-1 border-2 border-black w-full sm:w-auto">
                        👁️ VIEW NOW
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="font-headline font-black text-lg sm:text-2xl">No events available yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-12 sm:py-24 px-3 sm:px-6 md:px-12 bg-surface border-t-2 sm:border-t-4 border-black">
          <h2 className="font-headline font-black text-3xl sm:text-5xl uppercase tracking-tight mb-8 sm:mb-16 text-center">💥 Why CampusPulse?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: '🎯',
                title: 'One Stop Hub',
                desc: 'All campus events in one pulse - tech talks, sports, concerts, networking.',
              },
              {
                icon: '⚡',
                title: 'Join in Seconds',
                desc: 'Register, queue up, or join the waitlist. Manage your schedule effortlessly.',
              },
              {
                icon: '🤝',
                title: 'Connect & Grow',
                desc: 'Find your tribe, explore clubs, and build lasting campus connections.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="p-4 sm:p-8 border-2 sm:border-4 border-black bg-surface-container-lowest neo-shadow-lg text-center hover:neo-hover transition-all"
              >
                <div className="text-3xl sm:text-5xl mb-4">{feature.icon}</div>
                <h3 className="font-headline font-black text-lg sm:text-2xl uppercase tracking-tight mb-4">
                  {feature.title}
                </h3>
                <p className="font-body text-on-surface-variant text-sm sm:text-base">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Marquee Bar */}
      <div className="fixed bottom-0 left-0 w-full h-12 bg-black flex items-center overflow-hidden whitespace-nowrap border-t-4 border-yellow-400 z-40">
        <div className="flex animate-marquee space-x-8 items-center">
          {[1, 2, 3].map((i) => (
            <span
              key={i}
              className="text-primary-container font-headline font-black uppercase text-sm tracking-widest"
            >
              🔥 Live Now: Hackathon • Music Night • Sports Fest • Club Fair • Comedy Show • Career Expo •
            </span>
          ))}
        </div>
      </div>

      <div className="pb-20">
        <Footer />
      </div>
    </div>
  );
}

