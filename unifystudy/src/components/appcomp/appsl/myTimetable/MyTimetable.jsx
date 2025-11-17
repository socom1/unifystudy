<<<<<<< Updated upstream
// src/components/myTimetable/WeeklyCalendar.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { ref, onValue, push, set, remove } from "firebase/database";
import "./mt.css";

=======
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./mt.css"; // compiled from mt.scss

// Theme / data
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
const hours = Array.from({ length: 12 }, (_, i) => i + 8);

=======
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 → 19 (8am - 7pm)

/**
 * WeeklyCalendar
 * - Events are placed using CSS Grid (gridColumn & gridRow). This avoids manual pixel math.
 * - Vertical day lines are rendered dynamically here (so you can toggle/highlight programmatically).
 * - CSS variables control header height, row height and time column width to avoid offsets.
 */
>>>>>>> Stashed changes
export default function WeeklyCalendar() {
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    day: "Monday",
    start: 8,
    end: 9,
<<<<<<< Updated upstream
    color: colors[0],
  });
  const [userId, setUserId] = useState(null);

  // ✅ Track logged-in user
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return unsubscribe;
  }, []);

  // ✅ Load events from Firebase
  useEffect(() => {
    if (!userId) return;

    const eventsRef = ref(db, `users/${userId}/events`);
    const unsubscribe = onValue(eventsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Transform Firebase object into array with keys
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

  // ✅ Add event to Firebase
  const addEvent = (e) => {
    e.preventDefault();
    if (!userId) return alert("Please log in first.");
    if (!form.title.trim() || form.end <= form.start) return;

    const eventsRef = ref(db, `users/${userId}/events`);
    const newEventRef = push(eventsRef);
    set(newEventRef, form);

    setForm({ title: "", day: "Monday", start: 8, end: 9, color: colors[0] });
    setIsFormOpen(false);
  };

  // ✅ Delete event by Firebase key
  const deleteEvent = (eventId) => {
    if (!userId) return;
    remove(ref(db, `users/${userId}/events/${eventId}`));
=======
    color: "#4b6c82",
  });

  // load/store
  useEffect(() => {
    const stored = localStorage.getItem("weeklyCalendarEvents");
    if (stored) setEvents(JSON.parse(stored));
  }, []);
  useEffect(() => {
    localStorage.setItem("weeklyCalendarEvents", JSON.stringify(events));
  }, [events]);

  const addEvent = (e) => {
    e.preventDefault();
    if (!form.title.trim() || form.end <= form.start) return;
    // add new event object (could add id if needed)
    setEvents((prev) => [...prev, { ...form }]);
    setForm({ title: "", day: "Monday", start: 8, end: 9, color: "#4b6c82" });
    setIsFormOpen(false);
  };

  const deleteEvent = (event) => {
    setEvents((prev) =>
      prev.filter(
        (ev) =>
          !(
            ev.title === event.title &&
            ev.day === event.day &&
            ev.start === event.start &&
            ev.end === event.end
          )
      )
    );
  };

  // helper to compute CSS grid placement for an event
  // grid columns: column 1 = time column, columns 2..8 = Monday..Sunday
  // grid rows: row 1 = header, rows 2..13 = hours 8..19
  const getGridPlacement = (ev) => {
    const dayIndex = days.indexOf(ev.day);
    const startRow = ev.start - 7; // 8 -> 1, then + header => +1 => we'll adjust later
    const rowSpan = ev.end - ev.start;
    return {
      gridColumn: `${dayIndex + 2}`, // +2 since col 1 is time column
      gridRow: `${startRow + 1 + 1} / span ${rowSpan}`, // +1 to convert to 1-based, +1 to skip header row
      // (startRow + 2) is simpler: startRow + 2
    };
>>>>>>> Stashed changes
  };

  return (
    <div className="calendar-container">
<<<<<<< Updated upstream
=======
      {/* Top nav */}
>>>>>>> Stashed changes
      <div className="calendar-nav">
        <h2>Weekly Schedule</h2>
        <button onClick={() => setIsFormOpen((s) => !s)}>
          {isFormOpen ? "Close" : "Create Event"}
        </button>
      </div>

<<<<<<< Updated upstream
=======
      {/* Animated form */}
>>>>>>> Stashed changes
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
            <div className="form-group">
              <label>Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
<<<<<<< Updated upstream
                required
              />
            </div>
=======
                placeholder="Event title"
              />
            </div>

>>>>>>> Stashed changes
            <div className="form-group">
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
<<<<<<< Updated upstream
            <div className="form-group">
=======

            <div className="form-group small">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            <div className="form-group">
=======

            <div className="form-group small">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            <div className="form-group">
=======

            <div className="form-group small">
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
            <button type="submit">Add</button>
          </motion.form>
        )}
      </AnimatePresence>

<<<<<<< Updated upstream
      {/* Calendar Grid */}
      <div className="calendar-wrapper">
        <div className="calendar-grid">
=======
      {/* Calendar area: we set CSS variables inline for clarity (optional) */}
      <div
        className="calendar-wrapper"
        // Optionally you can set variables here. The stylesheet already has defaults.
        style={
          {
            // keep these in sync with mt.scss defaults if you change them
            // '--time-col-width': '60px',
            // '--header-height': '40px',
            // '--row-height': '70px',
          }
        }
      >
        <div className="calendar-grid">
          {/* Header row */}
>>>>>>> Stashed changes
          <div className="calendar-header">
            <div className="time-column-header">Time</div>
            {days.map((day) => (
              <div key={day} className="day-header">
                {day}
              </div>
            ))}
          </div>

<<<<<<< Updated upstream
=======
          {/* Time column (left) */}
>>>>>>> Stashed changes
          <div className="time-column">
            {hours.map((hour) => (
              <div key={hour} className="time-slot">
                {hour}:00
              </div>
            ))}
          </div>

<<<<<<< Updated upstream
=======
          {/* Transparent grid cells (one per day-hour) */}
>>>>>>> Stashed changes
          {hours.map((hour) =>
            days.map((day) => (
              <div key={`${day}-${hour}`} className="grid-cell" />
            ))
          )}

<<<<<<< Updated upstream
=======
          {/* Dynamic vertical day lines (rendered here so they align precisely and can be toggled/highlighted) */}
>>>>>>> Stashed changes
          {days.map((_, i) => (
            <div
              key={`vline-${i}`}
              className="day-line"
<<<<<<< Updated upstream
=======
              // left uses CSS calc + CSS variable --time-col-width for perfect alignment
>>>>>>> Stashed changes
              style={{
                left: `calc(var(--time-col-width, 60px) + ${i} * ((100% - var(--time-col-width, 60px)) / 7))`,
              }}
            />
          ))}

<<<<<<< Updated upstream
          {/* Events */}
          <AnimatePresence>
            {events.map((ev) => {
              const dayIndex = days.indexOf(ev.day);
              const startRow = ev.start - 7;
              const rowSpan = ev.end - ev.start;
=======
          {/* Events: placed using CSS gridRow/gridColumn to align exactly with cells */}
          <AnimatePresence>
            {events.map((ev, idx) => {
              const dayIndex = days.indexOf(ev.day);
              const startRow = ev.start - 7; // 8 => 1 relative to hours block
              const rowSpan = ev.end - ev.start;

              // gridRow calculation: header is row 1, time rows begin at row 2
              // so gridRow should be (startRow + 1) + 1 => startRow + 2
>>>>>>> Stashed changes
              const gridRowStart = startRow + 2;

              return (
                <motion.div
<<<<<<< Updated upstream
                  key={ev.id}
=======
                  key={`${ev.title}-${idx}-${ev.start}`} // better uniqueness for animations
>>>>>>> Stashed changes
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
                >
                  <span>{ev.title}</span>
                  <div className="event-details">
                    {ev.start}:00 — {ev.end}:00
                  </div>
                  <button
                    className="delete-btn"
<<<<<<< Updated upstream
                    onClick={() => deleteEvent(ev.id)}
=======
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEvent(ev);
                    }}
>>>>>>> Stashed changes
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
