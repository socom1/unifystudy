import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./mt.css";

const colors = ["red", "blue", "green", "yellow"];
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
  const [form, setForm] = useState({
    title: "",
    day: "Monday",
    start: 8,
    end: 9,
    color: "blue",
  });

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
    setEvents((prev) => [...prev, form]);
    setForm({ title: "", day: "Monday", start: 8, end: 9, color: "blue" });
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
        </div>
      </div>
    </div>
  );
}
