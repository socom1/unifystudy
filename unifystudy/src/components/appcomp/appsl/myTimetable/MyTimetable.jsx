// src/components/myTimetable/WeeklyCalendar.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { ref, onValue, push, set, remove } from "firebase/database";
import "./mt.css";

const colors = ["#4b6c82", "#afd4ed", "#e79950", "#e94f4f"];
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 → 19 (8am - 7pm)

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

  return (
    <div className="calendar-container">
      <div className="calendar-nav">
        <h2>Weekly Schedule</h2>
        <button onClick={() => setIsFormOpen((s) => !s)}>
          {isFormOpen ? "Close" : "Create Event"}
        </button>
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.form
            onSubmit={addEvent}
            className="event-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ ease: "easeOut", duration: 0.25 }}
          >
            <div className="header">
              <h3>Event:</h3>
            </div>

            <div className="form-group">
              <div className="title">
                <label>Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="desc">
                <label>
                  Description{" "}
                  <span style={{ color: "#afd4ed" }}>(optional)</span>
                </label>
                <textarea
                  type="text"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group sel">
              <div className="day">
                <label>Day</label>
                <select
                  value={form.day}
                  onChange={(e) => setForm({ ...form, day: e.target.value })}
                >
                  {days.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group ">
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

            <div className="form-group ">
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

            <div className="form-group ">
              <div className="cl">
                <label>Color</label>
                <select
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                >
                  {colors.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-buttons">
              <button type="submit">
                {editingEventId ? "Save Changes" : "Add"}
              </button>
              <button
                className="delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteEvent(ev.id);
                }}
              >
                Delete
              </button>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingEventId(null);
                  setForm({
                    title: "",
                    description: "",
                    day: "Monday",
                    start: 8,
                    end: 9,
                    color: colors[0],
                  });
                }}
              >
                Close
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="calendar-wrapper">
        <div className="calendar-grid">
          <div className="calendar-header">
            <div className="time-column-header">Time</div>
            {days.map((day) => (
              <div key={day} className="day-header">
                {day}
              </div>
            ))}
          </div>

          <div className="time-column">
            {hours.map((hour) => (
              <div key={hour} className="time-slot">
                {hour}:00
              </div>
            ))}
          </div>

          {hours.map((hour) =>
            days.map((day) => (
              <div key={`${day}-${hour}`} className="grid-cell" />
            ))
          )}

          {days.map((_, i) => (
            <div
              key={`vline-${i}`}
              className="day-line"
              style={{
                left: `calc(var(--time-col-width, 60px) + ${i} * ((100% - var(--time-col-width, 60px)) / 7))`,
              }}
            />
          ))}

          <AnimatePresence>
            {events.map((ev) => {
              const dayIndex = days.indexOf(ev.day);
              const startRow = ev.start - 7;
              const rowSpan = ev.end - ev.start;
              const gridRowStart = startRow + 2;

              return (
                <motion.div
                  key={ev.id}
                  className="event-box"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                  style={{
                    gridColumn: `${dayIndex + 2}`,
                    gridRow: `${gridRowStart} / span ${rowSpan}`,
                    backgroundColor: ev.color,
                  }}
                  onClick={() => editEvent(ev)}
                >
                  <span>{ev.title}</span>
                  <div className="event-details">
                    {ev.start}:00 — {ev.end}:00
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
