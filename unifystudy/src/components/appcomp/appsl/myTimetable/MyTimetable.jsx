import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./mt.css"; // compiled from mt.scss

// Theme / data
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
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm

export default function WeeklyCalendar() {
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    day: "Monday",
    start: 8,
    end: 9,
    color: "#4b6c82",
  });

  // Load stored events on mount
  useEffect(() => {
    const stored = localStorage.getItem("weeklyCalendarEvents");
    if (stored) setEvents(JSON.parse(stored));
  }, []);

  // Save events to localStorage
  useEffect(() => {
    localStorage.setItem("weeklyCalendarEvents", JSON.stringify(events));
  }, [events]);

  const addEvent = (e) => {
    e.preventDefault();
    if (!form.title.trim() || form.end <= form.start) return;
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

  return (
    <div className="calendar-container">
      {/* Top nav */}
      <div className="calendar-nav">
        <h2>Weekly Schedule</h2>
        <button onClick={() => setIsFormOpen((s) => !s)}>
          {isFormOpen ? "Close" : "Create Event"}
        </button>
      </div>

      {/* Animated form */}
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
                placeholder="Event title"
              />
            </div>

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

            <div className="form-group small">
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

            <div className="form-group small">
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

            <div className="form-group small">
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

            <button type="submit">Add</button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Calendar grid */}
      <div className="calendar-wrapper">
        <div className="calendar-grid">
          {/* Header row */}
          <div className="calendar-header">
            <div className="time-column-header">Time</div>
            {days.map((day) => (
              <div key={day} className="day-header">
                {day}
              </div>
            ))}
          </div>

          {/* Time column */}
          <div className="time-column">
            {hours.map((hour) => (
              <div key={hour} className="time-slot">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Transparent cells */}
          {hours.map((hour) =>
            days.map((day) => (
              <div key={`${day}-${hour}`} className="grid-cell" />
            ))
          )}

          {/* Events */}
          <AnimatePresence>
            {events.map((ev, idx) => {
              const dayIndex = days.indexOf(ev.day);
              const startRow = ev.start - 7;
              const rowSpan = ev.end - ev.start;
              const gridRowStart = startRow + 2;

              return (
                <motion.div
                  key={`${ev.title}-${idx}-${ev.start}`}
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
                    onClick={() => deleteEvent(ev)}
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
