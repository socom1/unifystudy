// src/components/myTimetable/WeeklyCalendar.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { ref, onValue, push, set, remove } from "firebase/database";
import { Plus, Bell, BellOff, X, Trash2, Save } from "lucide-react";
import "./mt.css";

const colors = ["var(--color-primary)", "var(--color-secondary)", "#e79950", "#e94f4f"];
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 → 21 (8am - 9pm)

// CurrentTimeLine removed from here (moved to bottom)

export default function WeeklyCalendar() {
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    day: "Monday",
    start: 8,
    end: 9,
    color: colors[0],
  });
  const [userId, setUserId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [notifiedEvents, setNotifiedEvents] = useState({});

  // Track logged-in user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return unsubscribe;
  }, []);

  // Load events from Firebase
  useEffect(() => {
    if (!userId) return;

    const eventsRef = ref(db, `users/${userId}/events`);
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedEvents = Object.entries(data).map(([id, value]) => ({
          id,
          ...value,
        }));
        setEvents(loadedEvents);
      } else {
        setEvents([]);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Add or update event
  const addEvent = (e) => {
    e.preventDefault();
    if (!userId) return alert("Please log in first.");
    if (!form.title.trim() || form.end <= form.start) return;

    const eventsRef = ref(db, `users/${userId}/events`);

    if (editingEventId) {
      // Update existing event
      set(ref(db, `users/${userId}/events/${editingEventId}`), form);
      setEditingEventId(null);
    } else {
      // Create new event
      const newEventRef = push(eventsRef);
      set(newEventRef, form);
    }

    // Reset form
    setForm({
      title: "",
      description: "",
      day: "Monday",
      start: 8,
      end: 9,
      color: colors[0],
    });
    setIsFormOpen(false);
  };

  // Delete event
  const deleteEvent = (eventId) => {
    if (!userId) return;
    remove(ref(db, `users/${userId}/events/${eventId}`));
    if (editingEventId === eventId) {
      setEditingEventId(null);
      setForm({
        title: "",
        description: "",
        day: "Monday",
        start: 8,
        end: 9,
        color: colors[0],
      });
      setIsFormOpen(false);
    }
  };

  // Edit event
  const editEvent = (ev) => {
    setForm({
      title: ev.title,
      description: ev.description || "",
      day: ev.day,
      start: ev.start,
      end: ev.end,
      color: ev.color,
    });
    setEditingEventId(ev.id);
    setIsFormOpen(true);
  };

  // Notification check (Keep existing logic)
  useEffect(() => {
    if (!("Notification" in window)) return;
    const checkUpcomingEvents = async () => {
      if (Notification.permission !== "granted") return;
      if (notificationsEnabled === false) return;

      const now = new Date();
      const currentDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      events.forEach(evt => {
        if (evt.day === currentDay) {
          const evtHour = evt.start;
          const eventTimeInMinutes = evtHour * 60;
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          const diff = eventTimeInMinutes - currentTimeInMinutes;

          if (diff === 10 && !notifiedEvents[evt.id]) {
             new Notification(`Upcoming Event: ${evt.title}`, {
               body: `Starts in 10 minutes at ${evt.start}:00`,
             });
             setNotifiedEvents(prev => ({ ...prev, [evt.id]: true }));
          }
          if (diff < 10 && notifiedEvents[evt.id]) {
            setNotifiedEvents(prev => {
              const newState = { ...prev };
              delete newState[evt.id];
              return newState;
            });
          }
        }
      });
    };
    const interval = setInterval(checkUpcomingEvents, 60000);
    return () => clearInterval(interval);
  }, [events, notifiedEvents, userId]); // notificationsEnabled missing in dep array but defined below

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  useEffect(() => {
      if (!userId) return;
      const settingsRef = ref(db, `users/${userId}/settings/notifications`);
      const unsub = onValue(settingsRef, (snapshot) => {
          const val = snapshot.val();
          setNotificationsEnabled(val !== false);
      });
      return () => unsub();
  }, [userId]);

  // --- RENDER HELPERS ---
  const ROW_HEIGHT = 100;
  const START_HOUR = 8;

  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <h2>Weekly Timetable</h2>
        <div style={{display: 'flex', gap: '1rem'}}>
            {("Notification" in window && Notification.permission !== "granted") && (
                <button onClick={() => {
                    Notification.requestPermission().then(() => {
                        window.location.reload();
                    });
                }} title="Enable Notifications">
                    <BellOff size={20} />
                </button>
            )}
            <button onClick={() => setIsFormOpen(true)} title="Add Event">
                <Plus size={20} /> Add Event
            </button>
        </div>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <>
            <motion.div 
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
            />
            <motion.form
              onSubmit={addEvent}
              className="event-form"
              initial={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
              animate={{ opacity: 1, scale: 1, y: "-50%", x: "-50%" }}
              exit={{ opacity: 0, scale: 0.95, y: "-50%", x: "-50%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="header">
                <h3>{editingEventId ? "Edit Event" : "New Event"}</h3>
              </div>
              <div className="form-group">
                <div className="title">
                  <label>Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    placeholder="e.g. Math Class"
                  />
                </div>
                <div className="desc">
                  <label>Description <span style={{ color: "var(--color-secondary)", fontSize: "0.8em" }}>(optional)</span></label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Add details..."
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group sel">
                  <div className="day">
                    <label>Day</label>
                    <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                      {days.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <div className="st">
                    <label>Start</label>
                    <select value={form.start} onChange={(e) => setForm({ ...form, start: parseInt(e.target.value) })}>
                      {hours.map((h) => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <div className="end">
                    <label>End</label>
                    <select value={form.end} onChange={(e) => setForm({ ...form, end: parseInt(e.target.value) })}>
                      {hours.map((h) => <option key={h} value={h}>{h}:00</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="cl">
                  <label>Color</label>
                  <div className="color-picker">
                    {colors.map((c) => (
                      <div 
                        key={c} 
                        className={`color-option ${form.color === c ? 'selected' : ''}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setForm({ ...form, color: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-buttons">
                <button type="button" className="cancel-btn" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  <Save size={18} /> {editingEventId ? "Save Changes" : "Add Event"}
                </button>
                {editingEventId && (
                  <button type="button" className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteEvent(editingEventId); }} title="Delete Event">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </motion.form>
          </>
        )}
      </AnimatePresence>

      <div className="calendar-wrapper">
        <div className="calendar-body">
          {/* Time Sidebar */}
          <div className="time-sidebar">
            <div className="time-header-spacer"></div>
            {hours.map(hour => (
              <div key={hour} className="time-label" style={{ height: ROW_HEIGHT }}>
                <span>{hour}:00</span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="days-grid">
            {days.map(day => (
              <div key={day} className="day-column">
                <div className="day-header">{day}</div>
                <div className="day-content">
                  {/* Background Grid Lines */}
                  {hours.map(hour => (
                    <div key={hour} className="grid-line" style={{ height: ROW_HEIGHT }}></div>
                  ))}

                  {/* Events for this day */}
                  <AnimatePresence>
                    {events.filter(ev => ev.day === day).map(ev => {
                      const top = (ev.start - START_HOUR) * ROW_HEIGHT;
                      const height = (ev.end - ev.start) * ROW_HEIGHT;
                      return (
                        <motion.div
                          key={ev.id}
                          className="event-box"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            top: `${top}px`,
                            height: `${height}px`,
                            "--event-color": ev.color,
                          }}
                          onClick={() => editEvent(ev)}
                        >
                          <div className="event-title">{ev.title}</div>
                          <div className="event-time">{ev.start}:00 - {ev.end}:00</div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  
                  {/* Current Time Line (Red Solid - Local) */}
                  <CurrentTimeLine day={day} />
                </div>
              </div>
            ))}
            {/* Global Dashed Line */}
            <CurrentTimeLine isGlobal />
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper for Current Time
const CurrentTimeLine = ({ day, isGlobal }) => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const startHour = 8;
  const endHour = 21; // 9 PM
  const ROW_HEIGHT = 100; // Must match main component

  if (currentHour < startHour || currentHour >= endHour) return null;

  // Calculate pixel offset
  const topOffset = ((currentHour - startHour) * ROW_HEIGHT) + ((currentMinute / 60) * ROW_HEIGHT);

  if (isGlobal) {
    // Add 50px to account for the day header height
    return <div className="global-time-line" style={{ top: `${topOffset + 50}px` }} />;
  }

  const daysArr = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = daysArr[now.getDay()];
  
  if (day !== currentDayName) return null;

  return (
    <div className="current-time-line" style={{ top: `${topOffset}px` }}>
      <div className="time-dot" />
    </div>
  );
};
