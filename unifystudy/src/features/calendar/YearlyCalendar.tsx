// @ts-nocheck
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalendarIcon, Sparkles, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '@/services/firebaseConfig';
import { ref, onValue } from 'firebase/database';
import './YearlyCalendar.scss';

const YearlyCalendar = () => {
  // Force re-render for UI update
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [direction, setDirection] = useState(0); // -1 for prev, 1 for next
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventType, setEventType] = useState('holiday');
  const [selectedDate, setSelectedDate] = useState({ month: 0, day: 1 });
  const [eventName, setEventName] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventEndDate, setEventEndDate] = useState({ month: 0, day: 1 });
  const [isDateRange, setIsDateRange] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar toggle

  // Subject Integration
  const [userId, setUserId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // Handle navigation from Grades
  const location = useLocation();
  useEffect(() => {
    if (location.state?.autoOpenModal && location.state?.initialEventSubject) {
        setTimeout(() => {
             setEventType('exam');
             setSelectedSubjectId(location.state.initialEventSubject);
             openEventModal('exam');
             setSelectedSubjectId(location.state.initialEventSubject);
        }, 500);
        
        window.history.replaceState({}, document.title);
    }
  }, [location, subjects]);

  // Day details panel
  const [selectedDayForDetails, setSelectedDayForDetails] = useState(null);
  const [showDayDetails, setShowDayDetails] = useState(false);

  // Load events from localStorage
  const [events, setEvents] = useState(() => {
    const stored = localStorage.getItem('calendar-events');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && !Array.isArray(parsed)) {
          const eventsArray = Object.entries(parsed).map(([key, event]) => ({
            id: Date.now().toString() + Math.random(),
            ...event,
            month: parseInt(key.split('-')[0]),
            day: parseInt(key.split('-')[1])
          }));
          localStorage.setItem('calendar-events', JSON.stringify(eventsArray));
          return eventsArray;
        }
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Error parsing calendar events:', e);
        return [];
      }
    }
    return [
      { id: '1', type: 'holiday', name: "New Year's Day", month: 0, day: 1 },
      { id: '2', type: 'holiday', name: "Christmas", month: 11, day: 25 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('calendar-events', JSON.stringify(events));
  }, [events]);

  // --- MOCK DATA FOR SCREENSHOT ---
  useEffect(() => {
     const MOCK_MODE = false;
     // Cleanup mock events if they persist
     const mockIds = ['m1', '3', '4', '5', '6'];
     setEvents(prev => prev.filter(e => !mockIds.includes(e.id)));
     
     if (MOCK_MODE) {
         setEvents([
             { id: '1', type: 'holiday', name: "New Year's Day", month: 0, day: 1, year: currentYear },
             { id: 'm1', type: 'holiday', name: "Winter Break", month: 0, day: 2, endMonth: 0, endDay: 15, year: currentYear },
             { id: '2', type: 'holiday', name: "Christmas", month: 11, day: 25, year: currentYear },
             { id: '3', type: 'exam', name: "Physics Midterm", month: 2, day: 15, time: '10:00', year: currentYear },
             { id: '4', type: 'exam', name: "Calc Final", month: 4, day: 20, time: '13:00', year: currentYear },
             { id: '5', type: 'holiday', name: "Spring Break", month: 3, day: 5, endMonth: 3, endDay: 12, year: currentYear },
             { id: '6', type: 'exam', name: "CS Project Due", month: 9, day: 10, time: '23:59', year: currentYear },
         ]);
     }
  }, [currentYear]); // Update when year changes (or just once)

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  // Fetch User ID & Subjects
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const gradesRef = ref(db, `users/${userId}/grades`);
    const unsub = onValue(gradesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, val]) => ({
          id,
          name: val.name
        }));
        setSubjects(arr);
      } else {
        setSubjects([]);
      }
    });
    return () => unsub();
  }, [userId]);

  const handlePrev = () => {
    setDirection(-1);
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNext = () => {
    setDirection(1);
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const openEventModal = (type, month = null, day = null, eventId = null) => {
    setEventType(type);
    setIsDateRange(type === 'holiday');
    
    if (month !== null && day !== null) {
      setSelectedDate({ month, day });
      if (eventId) {
        const event = events.find(e => e.id === eventId);
        if (event) {
          setEventName(event.name);
          setEventTime(event.time || '');
          setEditingEventId(eventId);
          if (event.endMonth !== undefined) {
            setEventEndDate({ month: event.endMonth, day: event.endDay });
            setIsDateRange(true);
          } else {
            setEventEndDate({ month, day });
          }
        }
      }
    } else {
      setSelectedDate({ month: currentMonth, day: 1 });
      setEventEndDate({ month: currentMonth, day: 1 });
      setEventName('');
      setEventTime('');
      setEditingEventId(null);
      setSelectedSubjectId('');
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEventName('');
    setEventTime('');
    setEditingEventId(null);
    setIsDateRange(false);
    setSelectedSubjectId('');
  };

  const saveEvent = () => {
    if (!eventName.trim()) return;
    
    const newEvent = {
      id: editingEventId || Date.now().toString(),
      type: eventType,
      name: eventName,
      month: selectedDate.month,
      day: selectedDate.day,
      year: currentYear, // Save the current view year
      time: eventTime,
      subjectId: selectedSubjectId, 
    };

    if (isDateRange && (eventEndDate.month !== selectedDate.month || eventEndDate.day !== selectedDate.day)) {
      newEvent.endMonth = eventEndDate.month;
      newEvent.endDay = eventEndDate.day;
    }

    if (editingEventId) {
      setEvents(events.map(e => e.id === editingEventId ? newEvent : e));
    } else {
      setEvents([...events, newEvent]);
    }
    
    closeEventModal();
  };

  const deleteEvent = (eventId) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleDayClick = (monthIndex, day) => {
    setSelectedDayForDetails({ month: monthIndex, day });
    setShowDayDetails(true);
  };

  const getEventsForDay = (month, day) => {
    return events.filter(event => {
      // Check for specific year if saved, otherwise match any year (legacy behavior) OR match current view year
      // For simplicity, if event has no year, we assume it repeats or is for this year.
      // But strictly, let's just match month/day for display in the grid (which is per month)
      // Ideally we filter by year too.
      const eventYear = event.year || currentYear; 
      if (eventYear !== currentYear) return false;

      if (event.month === month && event.day === day) return true;
      if (event.endMonth !== undefined) {
        // ... (date range logic)
        const startDate = new Date(currentYear, event.month, event.day);
        const endDate = new Date(currentYear, event.endMonth, event.endDay);
        const checkDate = new Date(currentYear, month, day);
        return checkDate >= startDate && checkDate <= endDate;
      }
      return false;
    });
  };

  // Force update every minute to keep comparison fresh
  const [nowTick, setNowTick] = useState(Date.now());
  
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000); // Every minute
    return () => clearInterval(interval);
  }, []);

  // --- Upcoming Events Logic ---
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date(); // Actual current time

    const futureEvents = events.map(event => {
      // Ensure numeric types
      const y = event.year || now.getFullYear();
      const m = parseInt(event.month);
      const d = parseInt(event.day);
      const eDate = new Date(y, m, d);
      return { ...event, dateObj: eDate };
    })
    .filter(e => {
        // Filter out past dates (yesterday or earlier)
        if (e.dateObj < today) return false;
        
        // If it's today, check if time has passed
        if (e.dateObj.getTime() === today.getTime() && e.time) {
            const [hours, minutes] = e.time.split(':').map(Number);
            const eventTime = new Date();
            eventTime.setHours(hours, minutes, 0, 0);
            
            // If event time is earlier than right now, it's passed
            if (eventTime < now) return false;
        }
        return true;
    }) 
    .sort((a, b) => a.dateObj - b.dateObj)
    .slice(0, 5);

    return futureEvents;
  }, [events, nowTick]); // Dependency on nowTick ensures re-calc


  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 50 : -50, // Reduced movement for cleaner feel
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0
    })
  };

  const renderMonth = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="day empty"></div>);
    }

    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentMonth && today.getFullYear() === currentYear;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = getEventsForDay(currentMonth, d);
      const hasHoliday = dayEvents.some(e => e.type === 'holiday');
      const hasExam = dayEvents.some(e => e.type === 'exam');
      const isToday = isCurrentMonth && today.getDate() === d;
      
      days.push(
        <div 
          key={d} 
          className={`day ${isToday ? 'today' : ''}`}
          onClick={() => handleDayClick(currentMonth, d)}
        >
          <span className="day-number">{d}</span>
          <div className="day-dots">
            {dayEvents.map((ev, idx) => (
               <div key={idx} className={`dot ${ev.type}`} title={ev.name} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <motion.div 
        className="month-card full-view"
        key={`${currentYear}-${currentMonth}`}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: "spring", stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 }
        }}
      >
        <div className="days-grid">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={i} className="day-label">{d}</div>
          ))}
          {days}
        </div>
      </motion.div>
    );
  };

  const dayDetailsEvents = selectedDayForDetails ? getEventsForDay(selectedDayForDetails.month, selectedDayForDetails.day) : [];

  return (
    <div className="yearly-calendar">
      <header className="calendar-header">
        <div className="controls">
          <button onClick={handlePrev}><ChevronLeft size={24} /></button>
          <h1>{months[currentMonth]} {currentYear}</h1>
          <button onClick={handleNext}><ChevronRight size={24} /></button>
        </div>
        
        <div className="header-actions">
          <button className="add-event-btn holiday" onClick={() => openEventModal('holiday')}>
            <Sparkles size={16} /> Holiday
          </button>
          <button className="add-event-btn exam" onClick={() => openEventModal('exam')}>
            <Plus size={16} /> Exam
          </button>
        </div>
      </header>
      
      <div className="calendar-content">
        <div className="calendar-main-area">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {renderMonth()}
          </AnimatePresence>
          
          {/* Mobile Toggle Button */}
          <button 
             className="upcoming-toggle-btn"
             onClick={() => setShowSidebar(!showSidebar)}
             title="Toggle Upcoming Events"
          >
             <Clock size={24} />
          </button>
        </div>
        
        {/* Sidebar for Upcoming - Toggle class based on state */}
        <div className={`upcoming-sidebar ${showSidebar ? 'open' : ''}`}>
           <div className="sidebar-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h3><Clock size={18} /> Upcoming</h3>
              {/* Close button for mobile */}
              <button 
                className="close-sidebar-btn" 
                onClick={() => setShowSidebar(false)}
                style={{
                  display: 'none', // Hidden on desktop via CSS potentially, but inline for now
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
           </div>
           
           <div className="upcoming-list">
             {upcomingEvents.length === 0 ? (
                <div className="no-upcoming">No upcoming events soon</div>
             ) : (
                upcomingEvents.map(ev => (
                  <div key={ev.id} className="upcoming-item">
                     <div className="up-header">
                        <span className="up-date">{months[ev.month].substring(0,3)} {ev.day}, {ev.year || currentYear}</span>
                        <div className={`up-badge ${ev.type}`} />
                     </div>
                     <h4>{ev.name}</h4>
                     {ev.time && (
                       <span className="up-time"><Clock size={12}/> {ev.time}</span>
                     )}
                  </div>
                ))
             )}
           </div>
        </div>
      </div>

      {/* Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEventModal}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>{editingEventId ? 'Edit' : 'Add'} {eventType === 'holiday' ? 'Holiday' : 'Exam'}</h2>
              
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={eventType === 'holiday' ? 'e.g., Winter Break' : 'e.g., Calculus Midterm'}
                  autoFocus
                />
              </div>

              {subjects.length > 0 && (
                  <div className="form-group">
                    <label>Link Subject (Optional)</label>
                    <select 
                        value={selectedSubjectId} 
                        onChange={(e) => {
                            setSelectedSubjectId(e.target.value);
                            const sub = subjects.find(s => s.id === e.target.value);
                            if (sub && !eventName) {
                                setEventName(`${sub.name} Exam`);
                            }
                        }}
                    >
                        <option value="">-- None --</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
              )}

              {eventType === 'exam' && (
                <div className="form-group">
                  <label>Time (optional)</label>
                  <input 
                    type="time" 
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                  />
                </div>
              )}

              {eventType === 'holiday' && (
                <div className="form-group checkbox-group">
                  <label style={{display:'flex', gap:'0.5rem', alignItems:'center'}}>
                    <input 
                      type="checkbox" 
                      checked={isDateRange}
                      onChange={(e) => setIsDateRange(e.target.checked)}
                      style={{width:'auto'}}
                    />
                    Date Range
                  </label>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>{isDateRange ? 'Start Month' : 'Month'}</label>
                  <select 
                    value={selectedDate.month} 
                    onChange={(e) => setSelectedDate({ ...selectedDate, month: parseInt(e.target.value) })}
                  >
                    {months.map((m, i) => (
                      <option key={i} value={i}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{isDateRange ? 'Start Day' : 'Day'}</label>
                  <input 
                    type="number" 
                    min="1" 
                    max={getDaysInMonth(currentYear, selectedDate.month)}
                    value={selectedDate.day}
                    onChange={(e) => setSelectedDate({ ...selectedDate, day: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {isDateRange && (
                <div className="form-row">
                  <div className="form-group">
                    <label>End Month</label>
                    <select 
                      value={eventEndDate.month} 
                      onChange={(e) => setEventEndDate({ ...eventEndDate, month: parseInt(e.target.value) })}
                    >
                      {months.map((m, i) => (
                        <option key={i} value={i}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>End Day</label>
                    <input 
                      type="number" 
                      min="1" 
                      max={getDaysInMonth(currentYear, eventEndDate.month)}
                      value={eventEndDate.day}
                      onChange={(e) => setEventEndDate({ ...eventEndDate, day: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button onClick={closeEventModal}>Cancel</button>
                <button className="primary" onClick={saveEvent}>Save Event</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day Details Panel */}
      <AnimatePresence>
        {showDayDetails && selectedDayForDetails && (
          <motion.div 
            className="day-details-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="panel-header">
              <h3>
                <CalendarIcon size={18} />
                {months[selectedDayForDetails.month]} {selectedDayForDetails.day}
              </h3>
              <button onClick={() => setShowDayDetails(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="panel-content">
              {dayDetailsEvents.length === 0 ? (
                <div className="no-events" style={{textAlign:'center', marginTop:'2rem', opacity:0.6}}>
                  <p>No events today</p>
                  <button 
                    style={{marginTop:'1rem', background:'transparent', border:'1px solid var(--border-color)', padding:'0.5rem 1rem', borderRadius:'8px', cursor:'pointer', color:'var(--text-primary)'}}
                    onClick={() => {
                      setShowDayDetails(false);
                      openEventModal('exam', selectedDayForDetails.month, selectedDayForDetails.day);
                    }}
                  >
                    + Add Event
                  </button>
                </div>
              ) : (
                <div className="events-list">
                  {dayDetailsEvents.map(event => (
                    <motion.div 
                      key={event.id} 
                      className={`event-card ${event.type}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                         <h4 style={{fontSize:'1rem'}}>{event.name}</h4>
                         <div style={{display:'flex', gap:'0.5rem'}}>
                           <button 
                             onClick={() => { setShowDayDetails(false); openEventModal(event.type, event.month, event.day, event.id); }} 
                             className="icon-btn edit"
                             title="Edit"
                           >
                             <Edit2 size={16} />
                           </button>
                           <button 
                             onClick={() => deleteEvent(event.id)} 
                             className="icon-btn delete"
                             title="Delete"
                           >
                             <Trash2 size={16} />
                           </button>
                         </div>
                      </div>
                      
                      {event.time && (
                        <div className="event-time">
                          <Clock size={12} style={{display:'inline', marginRight:'4px'}} />
                          {event.time}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="panel-footer">
              <button 
                className="add-another-btn"
                onClick={() => {
                  setShowDayDetails(false);
                  openEventModal('exam', selectedDayForDetails.month, selectedDayForDetails.day);
                }}
              >
                <Plus size={16} /> Quick Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YearlyCalendar;
