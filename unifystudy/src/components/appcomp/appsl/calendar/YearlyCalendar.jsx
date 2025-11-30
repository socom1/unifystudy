import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './YearlyCalendar.scss';

const YearlyCalendar = () => {
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

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

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
    }
    setShowEventModal(true);
  };

  const closeEventModal = () => {
    setShowEventModal(false);
    setEventName('');
    setEventTime('');
    setEditingEventId(null);
    setIsDateRange(false);
  };

  const saveEvent = () => {
    if (!eventName.trim()) return;
    
    const newEvent = {
      id: editingEventId || Date.now().toString(),
      type: eventType,
      name: eventName,
      month: selectedDate.month,
      day: selectedDate.day,
      time: eventTime,
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
      if (event.month === month && event.day === day) return true;
      if (event.endMonth !== undefined) {
        const startDate = new Date(currentYear, event.month, event.day);
        const endDate = new Date(currentYear, event.endMonth, event.endDay);
        const checkDate = new Date(currentYear, month, day);
        return checkDate >= startDate && checkDate <= endDate;
      }
      return false;
    });
  };

  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      zIndex: 0,
      x: direction < 0 ? 500 : -500,
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

    for (let d = 1; d <= daysInMonth; d++) {
      const dayEvents = getEventsForDay(currentMonth, d);
      const hasHoliday = dayEvents.some(e => e.type === 'holiday');
      const hasExam = dayEvents.some(e => e.type === 'exam');
      
      days.push(
        <div 
          key={d} 
          className={`day ${hasHoliday ? 'holiday' : ''} ${hasExam ? 'exam' : ''} ${dayEvents.length > 1 ? 'multi-event' : ''}`}
          onClick={() => handleDayClick(currentMonth, d)}
        >
          <span className="day-number">{d}</span>
          <div className="day-events-preview">
            {dayEvents.slice(0, 3).map((ev, idx) => (
              <div key={idx} className={`event-row ${ev.type}`} title={ev.name}>
                {ev.name}
              </div>
            ))}
            {dayEvents.length > 3 && <span className="more-events">+{dayEvents.length - 3}</span>}
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
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
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
          <button onClick={handlePrev}><ChevronLeft /></button>
          <h1>{months[currentMonth]} {currentYear}</h1>
          <button onClick={handleNext}><ChevronRight /></button>
        </div>
        
        <div className="header-actions">
          <div className="event-buttons">
            <button 
              className="add-event-btn holiday" 
              onClick={() => openEventModal('holiday')}
            >
              <Plus size={16} /> Holiday
            </button>
            <button 
              className="add-event-btn exam" 
              onClick={() => openEventModal('exam')}
            >
              <Plus size={16} /> Exam
            </button>
          </div>
        </div>
      </header>
      
      <div className="calendar-content">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {renderMonth()}
        </AnimatePresence>
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
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2>{editingEventId ? 'Edit' : 'Add'} {eventType === 'holiday' ? 'Holiday' : 'Exam'}</h2>
              
              <div className="form-group">
                <label>Name</label>
                <input 
                  type="text" 
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={eventType === 'holiday' ? 'e.g., Christmas' : 'e.g., Math Final'}
                  autoFocus
                />
              </div>

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
                  <label>
                    <input 
                      type="checkbox" 
                      checked={isDateRange}
                      onChange={(e) => setIsDateRange(e.target.checked)}
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
                <button className="primary" onClick={saveEvent}>Save</button>
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
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="panel-header">
              <h3>
                <CalendarIcon size={20} />
                {months[selectedDayForDetails.month]} {selectedDayForDetails.day}, {currentYear}
              </h3>
              <button onClick={() => setShowDayDetails(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="panel-content">
              {dayDetailsEvents.length === 0 ? (
                <div className="no-events">
                  <p>No events on this day</p>
                  <button 
                    className="add-event-btn exam" 
                    onClick={() => {
                      setShowDayDetails(false);
                      openEventModal('exam', selectedDayForDetails.month, selectedDayForDetails.day);
                    }}
                  >
                    <Plus size={16} /> Add Event
                  </button>
                </div>
              ) : (
                <div className="events-list">
                  {dayDetailsEvents.map(event => (
                    <motion.div 
                      key={event.id} 
                      className={`event-card ${event.type}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="event-header">
                        <span className={`event-badge ${event.type}`}>
                          {event.type === 'holiday' ? '🎉' : '📝'} {event.type}
                        </span>
                        <div className="event-actions">
                          <button 
                            onClick={() => {
                              setShowDayDetails(false);
                              openEventModal(event.type, event.month, event.day, event.id);
                            }}
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => deleteEvent(event.id)}
                            title="Delete"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                      <h4>{event.name}</h4>
                      {event.time && (
                        <div className="event-time">
                          <Clock size={14} />
                          {event.time}
                        </div>
                      )}
                      {event.endMonth !== undefined && (
                        <div className="event-duration">
                          {months[event.month]} {event.day} - {months[event.endMonth]} {event.endDay}
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
                <Plus size={16} /> Add Another Event
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default YearlyCalendar;
