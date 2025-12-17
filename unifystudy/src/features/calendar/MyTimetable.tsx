import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove } from "firebase/database";
import { Plus, Bell, BellOff, X, Trash2, Save } from "lucide-react";
import Modal from "@/components/common/Modal"; 
import "./MyTimetable.scss";
import { User, CalendarEvent } from "@/types";

console.log("MyTimetable Component Loaded"); 

const colors = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "#e79950",
  "#e94f4f",
];
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
const ROW_HEIGHT = 100;
const START_HOUR = 8;

interface WeeklyCalendarProps {
  user: User | null;
}

export default function WeeklyCalendar({ user }: WeeklyCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<CalendarEvent, 'id'>>({
    title: "",
    description: "",
    day: "Monday",
    start: 8,
    end: 9,
    color: colors[0],
  });
  
  // Derived from prop
  const userId = user ? user.uid : null;
  const userEmail = user ? user.email : null;

  const [editingEventId, setEditingEventId] = useState<string | null>(null);


  // Load events from Firebase
  useEffect(() => {
    if (!userId) return;

    const eventsRef = ref(db, `users/${userId}/events`);
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const loadedEvents = Object.entries(data).map(([id, value]) => ({
          id,
          ...(value as Omit<CalendarEvent, 'id'>),
        }));
        setEvents(loadedEvents);
      } else {
        setEvents([]);
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Memoize events grouped by day to avoid re-filtering on every render
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    days.forEach((day) => (grouped[day] = []));
    events.forEach((ev) => {
      if (grouped[ev.day]) {
        grouped[ev.day].push(ev);
      }
    });
    return grouped;
  }, [events]);

  // Add or update event
  const addEvent = (e: React.FormEvent) => {
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
  const deleteEvent = (eventId: string) => {
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

  // Edit event - useCallback to keep it stable for memoized DayColumn
  const editEvent = useCallback((ev: CalendarEvent) => {
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
  }, []);

  return (
    <div className="calendar-container">
      <NotificationManager events={events} userId={userId} />

      <div className="calendar-nav">
        <h2>Weekly Timetable</h2>
        <div style={{ display: "flex", gap: "1rem" }}>
          {"Notification" in window &&
            Notification.permission !== "granted" && (
              <button
                onClick={() => {
                  Notification.requestPermission().then(() => {
                    window.location.reload();
                  });
                }}
                title="Enable Notifications"
              >
                <BellOff size={20} />
              </button>
            )}
          <div className="header-actions">
            <button className="add-btn" onClick={() => {
              setForm({
                title: "",
                description: "",
                day: "Monday",
                start: 8,
                end: 9,
                color: colors[0],
              });
              setEditingEventId(null);
              setIsFormOpen(true);
            }}>
              <Plus size={20} />
              Add Event
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingEventId ? "Edit Event" : "New Event"}
        footer={(
          <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end', alignItems: 'center' }}>
             {editingEventId && (
              <button
                type="button"
                className="btn-danger"
                style={{ marginRight: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEvent(editingEventId);
                }}
                title="Delete Event"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={addEvent} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={18} /> {editingEventId ? "Save Changes" : "Add Event"}
            </button>
          </div>
        )}
      >
          <div className="event-form-shared-body">
              <div className="form-group">
                <div className="title">
                  <label>Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                    placeholder="e.g. Math Class"
                  />
                </div>
                <div className="desc" style={{ marginTop: '1rem' }}>
                  <label>
                    Description{" "}
                    <span
                      style={{
                        color: "var(--color-secondary)",
                        fontSize: "0.8em",
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Add details..."
                  />
                </div>
              </div>
              <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group sel" style={{ flex: 1 }}>
                  <div className="day">
                    <label>Day</label>
                    <select
                      value={form.day}
                      onChange={(e) =>
                        setForm({ ...form, day: e.target.value })
                      }
                    >
                      {days.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <div className="st">
                    <label>Start</label>
                    <select
                      value={form.start}
                      onChange={(e) =>
                        setForm({ ...form, start: parseInt(e.target.value) })
                      }
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <div className="end">
                    <label>End</label>
                    <select
                      value={form.end}
                      onChange={(e) =>
                        setForm({ ...form, end: parseInt(e.target.value) })
                      }
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {h}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="cl">
                  <label>Color</label>
                  <div className="color-picker" style={{ display: 'flex', gap: '0.8rem'}}>
                    {colors.map((c) => (
                      <div
                        key={c}
                        className={`color-option ${
                          form.color === c ? "selected" : ""
                        }`}
                        style={{ 
                            backgroundColor: c, 
                            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
                            border: form.color === c ? '2px solid white' : '2px solid transparent'
                        }}
                        onClick={() => setForm({ ...form, color: c })}
                      />
                    ))}
                  </div>
                </div>
              </div>
          </div>
      </Modal>

      <div className="calendar-wrapper">
        {/* 1. Sticky Header Row (Days) */}
        <div className="header-row-sticky">
          <div className="time-header-spacer"></div> {/* Empty box above time sidebar */}
          <div className="days-header-row">
            {days.map(day => (
              <div key={day} className="day-header-cell">
                <span className="desktop-day">{day}</span>
                <span className="mobile-day">{day.slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Scrollable Body (Times + Grid) */}
        <div className="calendar-scroll-area">
          <div className="calendar-content">
            
            {/* A. Time Sidebar (Scrolls with grid) */}
            <div className="time-sidebar">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="time-label"
                  style={{ height: ROW_HEIGHT }}
                >
                  <span>{hour}:00</span>
                </div>
              ))}
            </div>

            {/* B. Days Grid (Scrolls with sidebar) */}
            <div className="days-grid-body">
              <div className="days-content-wrapper">
                {/* Layer A: Background Grid Lines */}
                <BackgroundGrid />

                {/* Layer B: Event Columns */}
                <div className="events-layer">
                  {days.map((day) => (
                    <DayColumn
                      key={day}
                      day={day}
                      events={eventsByDay[day]}
                      onEditEvent={editEvent}
                    />
                  ))}
                </div>

                {/* Layer C: Global Time Line */}
                <GlobalCurrentTimeLine />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component for Notifications to avoid re-rendering the whole calendar
const NotificationManager = ({ events, userId }: { events: CalendarEvent[], userId: string | null }) => {
  const [notifiedEvents, setNotifiedEvents] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(new Date());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const settingsRef = ref(db, `users/${userId}/settings/notifications`);
    const unsub = onValue(settingsRef, (snapshot) => {
      const val = snapshot.val();
      setNotificationsEnabled(val !== false);
    });
    return () => unsub();
  }, [userId]);

  useEffect(() => {
    if (!("Notification" in window)) return;
    const checkUpcomingEvents = async () => {
      if (Notification.permission !== "granted") return;
      if (notificationsEnabled === false) return;

      const currentDay = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ][now.getDay()];
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      events.forEach((evt) => {
        if (evt.day === currentDay) {
          const evtHour = evt.start;
          const eventTimeInMinutes = evtHour * 60;
          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          const diff = eventTimeInMinutes - currentTimeInMinutes;

          if (diff === 10 && !notifiedEvents[evt.id]) {
            new Notification(`Upcoming Event: ${evt.title}`, {
              body: `Starts in 10 minutes at ${evt.start}:00`,
            });
            setNotifiedEvents((prev) => ({ ...prev, [evt.id]: true }));
          }
          if (diff < 10 && notifiedEvents[evt.id]) {
            setNotifiedEvents((prev) => {
              const newState = { ...prev };
              delete newState[evt.id];
              return newState;
            });
          }
        }
      });
    };
    checkUpcomingEvents();
  }, [now, events, notifiedEvents, notificationsEnabled]);

  return null;
};

// Background Grid Component (Renders full-width lines)
const BackgroundGrid = () => {
  return (
    <div className="background-grid">
      {hours.map((hour) => (
        <div
          key={hour}
          className="grid-line-row"
          style={{ height: ROW_HEIGHT }}
        />
      ))}
    </div>
  );
};

// Self-updating Day Time Line
const DayCurrentTimeLine = ({ day }: { day: string }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const startHour = 8;
  const endHour = 24; // Extended to midnight so line shows late at night

  if (currentHour < startHour || currentHour >= endHour) return null;

  const daysArr = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const currentDayName = daysArr[now.getDay()];

  if (day !== currentDayName) return null;

  const topOffset =
    (currentHour - startHour) * ROW_HEIGHT + (currentMinute / 60) * ROW_HEIGHT;

  return (
    <div className="current-time-line" style={{ top: `${topOffset}px` }}>
      <div className="time-dot" />
    </div>
  );
};

interface DayColumnProps {
  day: string;
  events: CalendarEvent[];
  onEditEvent: (ev: CalendarEvent) => void;
}

// Memoized Day Column (Events Only)
const DayColumn = memo(({ day, events, onEditEvent }: DayColumnProps) => {
  return (
    <div className="day-column">
      <div className="day-content">
        {/* Events for this day */}
        <AnimatePresence>
          {events &&
            events.map((ev) => {
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
                  } as React.CSSProperties}
                  onClick={() => onEditEvent(ev)}
                >
                  <div className="event-title">{ev.title}</div>
                  <div className="event-time">
                    {ev.start}:00 - {ev.end}:00
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>

        {/* Current Time Line (Red Solid - Local) */}
        <DayCurrentTimeLine day={day} />
      </div>
    </div>
  );
});

// Self-updating Global Time Line
const GlobalCurrentTimeLine = () => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const startHour = 8;
  const endHour = 24; // Extended to midnight so line shows late at night

  if (currentHour < startHour || currentHour >= endHour) return null;

  // Calculate pixel offset relative to the grid container
  const topOffset =
    (currentHour - startHour) * ROW_HEIGHT + (currentMinute / 60) * ROW_HEIGHT;

  return (
    <div className="global-time-line-active" style={{ top: `${topOffset}px` }}>
      <div className="time-label-tag">
        {currentHour}:{currentMinute.toString().padStart(2, '0')}
      </div>
    </div>
  );
};
