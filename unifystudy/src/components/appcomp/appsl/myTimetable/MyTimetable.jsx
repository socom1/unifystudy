import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
<<<<<<< Updated upstream
<<<<<<< Updated upstream
import "./mt.css";

const colors = ["red", "blue", "green", "yellow"];
=======
=======
>>>>>>> Stashed changes
import "./mt.css"; // compiled from mt.scss

// Theme / data
const colors = ["#4b6c82", "#afd4ed", "#e79950", "#e94f4f"];
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8am–7pm

export default function WeeklyCalendar() {
  const [events, setEvents] = useState([]);
=======
=======
>>>>>>> Stashed changes
const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 → 19 (8am - 7pm)

/**
 * WeeklyCalendar
 * - Events are placed using CSS Grid (gridColumn & gridRow). This avoids manual pixel math.
 * - Vertical day lines are rendered dynamically here (so you can toggle/highlight programmatically).
 * - CSS variables control header height, row height and time column width to avoid offsets.
 */
export default function WeeklyCalendar() {
  const [events, setEvents] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  const [form, setForm] = useState({
    title: "",
    day: "Monday",
    start: 8,
    end: 9,
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    color: "blue",
  });

=======
=======
>>>>>>> Stashed changes
    color: "#4b6c82",
  });

  // load/store
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  useEffect(() => {
    const stored = localStorage.getItem("weeklyCalendarEvents");
    if (stored) setEvents(JSON.parse(stored));
  }, []);
<<<<<<< Updated upstream
<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
  useEffect(() => {
    localStorage.setItem("weeklyCalendarEvents", JSON.stringify(events));
  }, [events]);

  const addEvent = (e) => {
    e.preventDefault();
    if (!form.title.trim() || form.end <= form.start) return;
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    setEvents((prev) => [...prev, form]);
    setForm({ title: "", day: "Monday", start: 8, end: 9, color: "blue" });
=======
=======
>>>>>>> Stashed changes
    // add new event object (could add id if needed)
    setEvents((prev) => [...prev, { ...form }]);
    setForm({ title: "", day: "Monday", start: 8, end: 9, color: "#4b6c82" });
    setIsFormOpen(false);
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
<<<<<<< Updated upstream
  return (
    <div className="calendar-container">
      <motion.form
        onSubmit={addEvent}
        className="event-form"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: "easeOut", duration: 0.5 }}
      >
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Day</label>
          <select
            value={form.day}
            onChange={(e) => setForm({ ...form, day: e.target.value })}
          >
            {days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
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

        <div className="form-group">
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

        <div className="form-group">
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

        <button type="submit">Add Event</button>
      </motion.form>

      <div className="calendar-wrapper">
        <div className="calendar-grid">
=======
=======
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
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
<<<<<<< Updated upstream
=======
          {/* Time column (left) */}
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
          <div className="days-grid">
            {hours.map((hour) =>
              days.map((day) => (
                <div key={`${day}-${hour}`} className="grid-cell"></div>
              ))
            )}

            {/* Manual vertical lines */}
            {days.map((_, i) => (
              <div
                key={`vline-${i}`}
                className="vertical-line"
                style={{
                  left: `calc(60px + ${i} * ((100% - 60px) / 7))`,
                }}
              />
            ))}

            <AnimatePresence>
              {events.map((ev, i) => {
                const top = (ev.start - 8) * 60 + 40;
                const height = (ev.end - ev.start) * 60;
                const colIndex = days.indexOf(ev.day);

                return (
                  <motion.div
                    key={i}
                    className={`event-box ${ev.color}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ ease: "easeOut", duration: 0.3 }}
                    style={{
                      top: `${top + 4}px`,
                      height: `${height - 4}px`,
                      backgroundColor: ev.color,
                      "--col-index": colIndex,
                      left: `calc(60px + ${colIndex} * ((100% - 60px) / 7) + 4px)`,
                      width: `calc((100% - 60px) / 7 - 8px)`,
                    }}
                  >
                    <span>{ev.title}</span>
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
=======
=======
>>>>>>> Stashed changes
          {/* Transparent grid cells (one per day-hour) */}
          {hours.map((hour) =>
            days.map((day) => (
              <div key={`${day}-${hour}`} className="grid-cell" />
            ))
          )}

          {/* Dynamic vertical day lines (rendered here so they align precisely and can be toggled/highlighted) */}
          {days.map((_, i) => (
            <div
              key={`vline-${i}`}
              className="day-line"
              // left uses CSS calc + CSS variable --time-col-width for perfect alignment
              style={{
                left: `calc(var(--time-col-width, 60px) + ${i} * ((100% - var(--time-col-width, 60px)) / 7))`,
              }}
            />
          ))}

          {/* Events: placed using CSS gridRow/gridColumn to align exactly with cells */}
          <AnimatePresence>
            {events.map((ev, idx) => {
              const dayIndex = days.indexOf(ev.day);
              const startRow = ev.start - 7; // 8 => 1 relative to hours block
              const rowSpan = ev.end - ev.start;

              // gridRow calculation: header is row 1, time rows begin at row 2
              // so gridRow should be (startRow + 1) + 1 => startRow + 2
              const gridRowStart = startRow + 2;

              return (
                <motion.div
                  key={`${ev.title}-${idx}-${ev.start}`} // better uniqueness for animations
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
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEvent(ev);
                    }}
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
        </div>
      </div>
    </div>
  );
}
