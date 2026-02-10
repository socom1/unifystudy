import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { Plus, Bell, BellOff, X, Trash2, Save, Wand2, Calendar as CalendarIcon, BookOpen, Dumbbell, Code, Coffee, Music, Briefcase, GraduationCap, LayoutList, MoreHorizontal } from "lucide-react";
import Modal from "@/components/common/Modal"; 
import { toast } from "sonner";
import { connectGoogleCalendar, fetchUpcomingEvents } from "@/services/googleCalendar";
import { fetchOutlookEvents } from "@/services/microsoftIntegration";
import "./MyTimetable.scss";

import { User, CalendarEvent } from "@/types";

const getEventIcon = (type?: string) => {
    switch(type) {
        case 'Lecture': return <BookOpen size={14} />;
        case 'Gym': return <Dumbbell size={14} />;
        case 'Study': return <GraduationCap size={14} />;
        case 'Workshop': return <Code size={14} />;
        case 'Other': return <Coffee size={14} />;
        default: return <Briefcase size={14} />;
    }
};

 

const colors = [
  "var(--color-primary)",
  "var(--color-secondary)",
  "var(--color-accent, #e79950)",
  "#ef4444", // Danger/Red
  "#22c55e", // Success/Green
  "#3b82f6", // Blue
  "#a855f7", // Purple
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
const hours = Array.from({ length: 24 }, (_, i) => i); // 0 → 23 (24h)
const ROW_HEIGHT = 100;
const START_HOUR = 0;

interface WeeklyCalendarProps {
  user: User | null;
}

export default function WeeklyCalendar({ user }: WeeklyCalendarProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<CalendarEvent, 'id'>>({
    title: "",
    description: "",
    day: "Monday",
    start: 8,
    end: 9,
    color: colors[0],
    type: 'Lecture' as const,
  });
  
  // Magic Fill State
  const [isMagicFillOpen, setIsMagicFillOpen] = useState(false);
  const [magicFillInput, setMagicFillInput] = useState("");

  // Google Calendar State
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Derived from prop
  const userId = user ? user.uid : null;
  const userEmail = user ? user.email : null;

  const [editingEventId, setEditingEventId] = useState<string | null>(null);


  // Load events from Firebase
  useEffect(() => {
    if (!userId) return;

    const eventsRef = ref(db, `users/${userId}/events`);
    
    // Mock Mode Check
    const MOCK_MODE = false; 
    
    if (MOCK_MODE) {
        setEvents([
            { id: '1', title: 'Calculus III', day: 'Monday', start: 10, end: 11, color: colors[0], description: 'Room 304' },
            { id: '2', title: 'Algorithms', day: 'Monday', start: 14, end: 16, color: colors[6], description: 'Lecture Hall B' },
            { id: '3', title: 'Physics 101', day: 'Tuesday', start: 13, end: 14, color: colors[5], description: 'Lab Session' },
            { id: '4', title: 'Digital Logic', day: 'Tuesday', start: 10, end: 12, color: colors[2], description: '' },
            { id: '5', title: 'Calculus III', day: 'Wednesday', start: 10, end: 11, color: colors[0], description: 'Room 304' },
            { id: '6', title: 'Algorithms', day: 'Wednesday', start: 14, end: 16, color: colors[6], description: 'Lecture Hall B' },
            { id: '7', title: 'Physics 101', day: 'Thursday', start: 13, end: 14, color: colors[5], description: 'Lab Session' },
            { id: '8', title: 'Study Group', day: 'Thursday', start: 16, end: 18, color: colors[1], description: 'Library' },
            { id: '9', title: 'Calculus III', day: 'Friday', start: 10, end: 11, color: colors[0], description: 'Room 304' },
            { id: '10', title: 'Gym', day: 'Friday', start: 17, end: 18, color: colors[4], description: 'Leg Day' },
            { id: '11', title: 'Weekly Review', day: 'Sunday', start: 19, end: 20, color: colors[3], description: 'Plan next week' },
        ]);
        return; // Skip real listener
    }

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

  // eventsByDay is now handled after allEvents definition

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
      type: 'Lecture',
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
        type: 'Lecture',
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
      type: ev.type || 'Lecture',
    });
    setEditingEventId(ev.id);
    setIsFormOpen(true);
  }, []);

  const handleMagicFill = async () => {
      if (!userId || !magicFillInput.trim()) return;
      
      const rawTasks = magicFillInput.split(',').map(t => t.trim()).filter(Boolean);
      if (rawTasks.length === 0) return;

      const workDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      const weekendDays = ["Saturday", "Sunday"];
      const allDays = [...workDays, ...weekendDays];

      // Parse tasks for duration (e.g., "Math 2h") and Day (e.g. "on Friday")
      const tasksToSchedule = rawTasks.map(text => {
          let cleanTitle = text;
          let duration = 1;
          let allowedDays = workDays; // Default to Mon-Fri

          // 1. Parse Duration
          const durationMatch = cleanTitle.match(/(?:for\s+)?(\d+(?:\.\d+)?)\s*(?:hours?|h|hrs?)/i);
          if (durationMatch) {
              const val = parseFloat(durationMatch[1]);
              if (!isNaN(val) && val > 0) {
                  duration = Math.ceil(val);
              }
              cleanTitle = cleanTitle.replace(durationMatch[0], '');
          }

          // Check for "Weekend"
          if (/on\s+weekend|this\s+weekend|weekend/i.test(cleanTitle)) {
              allowedDays = weekendDays;
              cleanTitle = cleanTitle.replace(/(?:on\s+|this\s+)?weekend/i, '');
          } 
          // Check for "Weekday"
          else if (/on\s+weekday|weekday/i.test(cleanTitle)) {
              allowedDays = workDays;
              cleanTitle = cleanTitle.replace(/(?:on\s+)?weekday/i, '');
          }
          // Check for specific days (Mon-Sun)
          else {
              const dayMatch = cleanTitle.match(/(?:on\s+)?\b(mon|tue|wed|thu|fri|sat|sun)(?:day|nes|sday|urs|urday)?\b/i);
              if (dayMatch) {
                  const dayNameMap: Record<string, string> = {
                      mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday",
                      sat: "Saturday", sun: "Sunday"
                  };
                  const key = dayMatch[1].toLowerCase();
                  if (dayNameMap[key]) {
                      allowedDays = [dayNameMap[key]];
                  }
                  cleanTitle = cleanTitle.replace(dayMatch[0], '');
              }
          }

          // Cleanup title
          cleanTitle = cleanTitle.trim().replace(/^[\s,.-]+|[\s,.-]+$/g, '');
          if (!cleanTitle) cleanTitle = "Task";

          return { title: cleanTitle, duration, allowedDays, original: text };
      });

      // Sort by duration descending (fit Big Rocks first)
      tasksToSchedule.sort((a, b) => b.duration - a.duration);

      const newEvents: Omit<CalendarEvent, "id">[] = [];
      const usedSlots = new Set<string>(); // key: "Day-Hour"

      // 1. Map existing usage
      events.forEach(ev => {
          for (let h = ev.start; h < ev.end; h++) {
              usedSlots.add(`${ev.day}-${h}`);
          }
      });
      
      const startHour = 0;
      const endHour = 23;

      // 2. Assign tasks
      let scheduledCount = 0;

      for (const task of tasksToSchedule) {
          // Find all valid slots for this task duration on ALLOWED days
          const validSlots: { day: string; start: number }[] = [];
          
          task.allowedDays.forEach(day => {
               // We need a block of 'task.duration' free hours
               for (let h = startHour; h <= endHour - task.duration; h++) {
                   let isFree = true;
                   for (let t = 0; t < task.duration; t++) {
                       if (usedSlots.has(`${day}-${h + t}`)) {
                           isFree = false;
                           break;
                       }
                   }
                   if (isFree) {
                       validSlots.push({ day, start: h });
                   }
               }
          });

          if (validSlots.length === 0) {
              const dayStr = task.allowedDays.length > 2 ? "Weekdays" : task.allowedDays.join("/");
              toast.error(`No ${task.duration}h slot found for "${task.title}" on ${dayStr}`);
              continue;
          }

          // Pick random valid slot
          const slot = validSlots[Math.floor(Math.random() * validSlots.length)];
          
          newEvents.push({
              title: task.title,
              description: `Auto-Scheduled (${task.duration}h) - "${task.original}"`,
              day: slot.day,
              start: slot.start,
              end: slot.start + task.duration,
              color: colors[Math.floor(Math.random() * colors.length)]
          });

          // Mark slots as used
          for (let t = 0; t < task.duration; t++) {
              usedSlots.add(`${slot.day}-${slot.start + t}`);
          }
          scheduledCount++;
      }

      if (newEvents.length === 0) {
          if (scheduledCount === 0) toast.error("Could not schedule any tasks.");
          return;
      }

      // 3. Save to Firebase
      const eventsRef = ref(db, `users/${userId}/events`);
      const safeUpdates: Record<string, any> = {};
      
      newEvents.forEach(ev => {
          const newRef = push(eventsRef);
          if (newRef.key) {
             safeUpdates[newRef.key] = ev;
          }
      });
      
      await update(eventsRef, safeUpdates);

      toast.success(`Scheduled ${scheduledCount} tasks!`);
      setMagicFillInput("");
      setIsMagicFillOpen(false);
  };




  const [outlookEvents, setOutlookEvents] = useState<CalendarEvent[]>([]);

  // Expose function to trigger sync from outside if needed, or just let user manually sync via a new button
  // For now, let's try to load from local storage if we had a persistent token, but we don't.
  // We can add a "Sync External" button in this component too.

  const allEvents = [...events, ...googleEvents, ...outlookEvents];

  // Memoize events grouped by day to avoid re-filtering on every render
  const eventsByDay = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    days.forEach((day) => (grouped[day] = []));
    allEvents.forEach((ev) => {
      if (grouped[ev.day]) {
        grouped[ev.day].push(ev);
      }
    });
    return grouped;
  }, [allEvents]);

  // Sync Handlers
  const handleSyncCalendars = async () => {
      setIsSyncing(true);
      try {
          // Google
          try {
              const gToken = await import("@/services/googleCalendar").then(m => m.connectGoogleCalendar());
              const gEvents = await import("@/services/googleCalendar").then(m => m.fetchUpcomingEvents(gToken));
              setGoogleEvents(gEvents); 
              toast.success("Synced Google Calendar");
          } catch(e) { console.log(e); }

          // Outlook
          try {
              const msToken = await import("@/services/microsoftIntegration").then(m => m.connectMicrosoft());
              const msEvents = await import("@/services/microsoftIntegration").then(m => m.fetchOutlookEvents(msToken));
              
              const normEvents = msEvents.map((e: any) => {
                  const d = new Date(e.start.dateTime);
                  // Outlook returns UTC or specified timezone. We requested UTC preferred.
                  // Simple day mapping:
                  const dayIndex = d.getDay(); // 0=Sun, 1=Mon...
                  const dayName = days[dayIndex === 0 ? 6 : dayIndex - 1]; // MyTimetable 'days' array is Mon(0)...Sun(6)
                  
                  return {
                      id: `outlook-${e.id}`,
                      title: e.subject,
                      description: e.bodyPreview || "",
                      day: dayName,
                      start: d.getHours(), // Simple hour extraction
                      end: new Date(e.end.dateTime).getHours() || (d.getHours() + 1),
                      color: "#0078D4",
                      type: 'Other'
                  };
              });
              
              setOutlookEvents(normEvents);
              toast.success("Synced Outlook Calendar");
          } catch(e) { console.log(e); }

      } catch (err) {
          toast.error("Sync failed");
      } finally {
          setIsSyncing(false);
      }
  };

  return (
    <div className="calendar-container" onClick={() => { setEditingEventId(null); setIsFormOpen(false); }}>
      <NotificationManager events={allEvents} userId={userId} />



      {/* Magic Fill Modal */}
      <Modal
        isOpen={isMagicFillOpen}
        onClose={() => setIsMagicFillOpen(false)}
        title="✨ Magic Fill Schedule"
        footer={(
             <div style={{ display: 'flex', gap: '1rem', width: '100%', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsMagicFillOpen(false)}
                >
                  Cancel
                </button>
                <button 
                    type="button" 
                    className="btn-primary" 
                    onClick={() => handleMagicFill()}
                    style={{ background: 'var(--color-secondary)', color: 'white', fontWeight: 600 }}
                >
                  Auto-Schedule
                </button>
              </div>
        )}
      >
        <div style={{ padding: '0.5rem' }}>
            <p style={{ color: 'var(--color-muted)', marginBottom: '1rem' }}>
                Enter a list of tasks (comma separated). You can specify <b>duration</b> and <b>day</b>!
                <br/>
                Examples: <i>"Math 2h on Mon, Gym Weekend, Physics 90m on Friday"</i> (Default: 1h, Weekdays)
            </p>
            <textarea
                value={magicFillInput}
                onChange={(e) => setMagicFillInput(e.target.value)}
                placeholder="e.g. Math 2h on Mon, Gym Weekend, Physics 1.5h..."
                style={{
                    width: '100%',
                    height: '150px',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-1)', 
                    color: 'var(--color-text)'
                }}
            />
        </div>
      </Modal>

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
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Event Type</label>
                <div className="type-selector" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Lecture', 'Workshop', 'Study', 'Other'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`type-btn ${form.type === t ? 'selected' : ''}`}
                      onClick={() => setForm({...form, type: t as any})}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: `1px solid ${form.type === t ? 'var(--color-primary)' : 'var(--glass-border)'}`,
                        background: form.type === t ? 'rgba(var(--primary-rgb), 0.1)' : 'transparent',
                        color: form.type === t ? 'var(--color-primary)' : 'var(--color-text-dim)',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t}
                    </button>
                  ))}
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

      <div className="calendar-wrapper" style={{ position: 'relative' }}>
          {/* 1. MENU BUTTON (Top Left - List View Only) */}
          <AnimatePresence>
            {view === 'list' && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 'var(--time-col-width)',
                        height: 'var(--header-height, 40px)',
                        zIndex: 70,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg-1)', 
                        backdropFilter: 'blur(8px)',
                        borderBottom: '1px solid var(--glass-border)',
                        borderRight: '1px solid var(--glass-border)',
                        borderBottomRightRadius: '12px' 
                    }}
                >
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-dim)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color 0.2s'
                        }}
                        className="hover-bright"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <div 
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                                    onClick={() => setIsMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    style={{
                                        position: 'absolute',
                                        top: '80%', left: '4px',
                                        background: 'var(--bg-1)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        padding: '0.5rem',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                        zIndex: 100, width: '180px',
                                        display: 'flex', flexDirection: 'column', gap: '4px'
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)', padding: '4px 8px', textTransform: 'uppercase' }}>View Mode</div>
                                    <button onClick={() => { setView('grid'); setIsMenuOpen(false); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <CalendarIcon size={16} /> Grid View
                                    </button>
                                    <button onClick={() => { setView('list'); setIsMenuOpen(false); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <LayoutList size={16} /> List View
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
                                    <button onClick={() => { setIsMagicFillOpen(true); setIsMenuOpen(false); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--color-secondary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <Wand2 size={16} /> Magic Fill
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}
          </AnimatePresence>

          {/* 2. ADD BUTTON (Top Right - List View Only) */}
          <AnimatePresence>
            {view === 'list' && (
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        height: 'var(--header-height, 40px)',
                        zIndex: 70,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        paddingRight: '1rem' // Spacing from edge
                    }}
                >
                    <button
                        onClick={() => {
                            setForm({ title: "", description: "", day: days[0], start: 9, end: 10, color: colors[0], type: 'Lecture' });
                            setEditingEventId(null);
                            setIsFormOpen(true);
                        }}
                        style={{
                            background: 'var(--color-primary)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add Event
                    </button>
                </motion.div>
            )}
          </AnimatePresence>

        {view === 'grid' ? (
            /* Scrollable Body (Includes Sticky Header for alignment) */
            <div className="calendar-scroll-area">
            <div className="calendar-master-grid">
                
                {/* 1. Time Header Spacer (Top Left Sticky) + Actions Menu */}
                <div className="time-header-spacer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'sticky', top: 0, left: 0, zIndex: 80 }}>
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-dim)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'color 0.2s'
                        }}
                        className="hover-bright"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    <AnimatePresence>
                        {isMenuOpen && (
                            <>
                                <div 
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                                    onClick={() => setIsMenuOpen(false)}
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    style={{
                                        position: 'absolute',
                                        top: '80%', left: '4px',
                                        background: 'var(--bg-1)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '12px',
                                        padding: '0.5rem',
                                        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                                        zIndex: 100, width: '180px',
                                        display: 'flex', flexDirection: 'column', gap: '4px'
                                    }}
                                >
                                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-dim)', padding: '4px 8px', textTransform: 'uppercase' }}>View Mode</div>
                                    <button onClick={() => { setView('grid'); setIsMenuOpen(false); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <CalendarIcon size={16} /> Grid View
                                    </button>
                                    <button onClick={() => { setView('list'); setIsMenuOpen(false); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--color-text)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                                        <LayoutList size={16} /> List View
                                    </button>
                                    <div style={{ height: '1px', background: 'var(--glass-border)', margin: '4px 0' }} />
                                    <button onClick={() => { setIsMagicFillOpen(true); setIsMenuOpen(false); }} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', background: 'transparent', border: 'none', color: 'var(--color-secondary)', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem', fontWeight: 600 }}>
                                        <Wand2 size={16} /> Magic Fill
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* 2. Days Header Row (Top Right Sticky) */}
                <div className="days-header-row">
                {days.map(day => (
                    <div key={day} className="day-header-cell">
                    <span className="desktop-day">{day}</span>
                    <span className="mobile-day">{day.slice(0, 3)}</span>
                    </div>
                ))}
                </div>

                {/* 3. Time Sidebar (Bottom Left) */}
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

                {/* 4. Days Grid Body (Bottom Right) */}
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
                        onAddEvent={(startHour) => {
                            setForm({
                                title: "",
                                description: "",
                                day: day,
                                start: startHour,
                                end: startHour + 1,
                                color: colors[0],
                                type: 'Lecture'
                            });
                            setEditingEventId(null);
                            setIsFormOpen(true);
                        }}
                        />
                    ))}
                    </div>

                    {/* Layer C: Global Time Line */}
                    <GlobalCurrentTimeLine />
                </div>
                </div>

            </div>
            </div>
        ) : (
            /* LIST VIEW */
            <div className="calendar-list-view" style={{ overflowY: 'auto', padding: '0.5rem', paddingTop: '60px' }}>
                {days.map(day => {
                    const dayEvents = eventsByDay[day].sort((a,b) => a.start - b.start);
                    if (dayEvents.length === 0) return null; // Skip empty days

                    return (
                        <div key={day} className="list-view-day-group" style={{ marginBottom: '1.5rem' }}>
                            <h3 style={{ 
                                fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', 
                                marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px',
                                textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9
                            }}>
                                <div style={{ width: '4px', height: '16px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                                {day}
                            </h3>
                            <div className="list-view-events" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                {dayEvents.map(ev => (
                                    <div 
                                        key={ev.id} 
                                        className="list-event-card"
                                        onClick={() => editEvent(ev)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                            padding: '1rem',
                                            background: 'var(--glass-bg)',
                                            border: '1px solid var(--glass-border)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s',
                                            position: 'relative',
                                            overflow: 'hidden'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <div style={{ 
                                            position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: ev.color 
                                        }} />
                                        
                                        {/* Time Box */}
                                        <div style={{ 
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            minWidth: '60px', paddingRight: '1rem', borderRight: '1px solid var(--glass-border)'
                                        }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{ev.start}:00</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                                                {ev.end - ev.start}h
                                            </span>
                                        </div>

                                        {/* Content */}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{ev.title}</h4>
                                                {ev.type && (
                                                    <span style={{ 
                                                        fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px',
                                                        background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-dim)', border: '1px solid var(--glass-border)'
                                                    }}>
                                                        {ev.type}
                                                    </span>
                                                )}
                                            </div>
                                            {ev.description && (
                                                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>{ev.description}</p>
                                            )}
                                        </div>

                                        <div style={{ opacity: 0.5 }}>
                                            {getEventIcon(ev.type)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
                {/* Empty State if no events at all */}
                {allEvents.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-dim)' }}>
                        <div style={{ marginBottom: '1rem', opacity: 0.5 }}><CalendarIcon size={48} /></div>
                        <p>No events scheduled. Use <b>Magic Fill</b> or click the <b>+</b> button!</p>
                    </div>
                )}
                

            </div>
        )}
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

          // Notify 10 minutes before
          // Also explicitly mention Lecture/Lab/Study if applicable for flavor
          if (diff <= 15 && diff > 0 && !notifiedEvents[evt.id]) {
            const isStudyRelated = ['Lecture', 'Study', 'Workshop', 'Lab'].includes(evt.type || '');
            const bodyText = isStudyRelated 
                ? `Get ready for ${evt.title}! Starting in ${Math.round(diff)} mins.`
                : `Upcoming: ${evt.title} at ${evt.start}:00`;
            
            new Notification(`UnifyStudy: ${evt.title}`, {
              body: bodyText,
              icon: '/logo.png',
              badge: '/logo.png'
            });
            setNotifiedEvents((prev) => ({ ...prev, [evt.id]: true }));
          }
          
          if (diff <= 0 && notifiedEvents[evt.id]) {
             // Cleanup
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

  const MOCK_MODE = true;
  const displayTime = useMemo(() => {
      if (MOCK_MODE) {
          const d = new Date();
          const currentDay = d.getDay();
          const distanceToMon = 1 - currentDay; // Force Monday (1)
          d.setDate(d.getDate() + distanceToMon);
          d.setHours(10, 30, 0, 0); 
          return d;
      }
      return now;
  }, [now]);

  const currentHour = displayTime.getHours();
  const currentMinute = displayTime.getMinutes();
  const startHour = 0;
  const endHour = 24; 

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
  const currentDayName = daysArr[displayTime.getDay()];

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
  onAddEvent: (startHour: number) => void;
}

// Memoized Day Column (Events Only)
const DayColumn = memo(({ day, events, onEditEvent, onAddEvent }: DayColumnProps) => {
  return (
    <div className="day-column">
      {/* Click zones with Hover Effect */}
      <div className="day-click-zones" style={{ position: 'absolute', inset: 0, zIndex: 5 }}>
          {hours.map(h => (
              <div 
                key={h} 
                className="hour-click-zone"
                style={{ height: ROW_HEIGHT, width: '100%' }}
              >
                  <button 
                    className="add-event-ghost-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAddEvent(h);
                    }}
                    title={`Add event at ${h}:00`}
                  >
                      <Plus size={16} strokeWidth={3} />
                  </button>
              </div>
          ))}
      </div>

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
                  layoutId={ev.id}
                  className="event-box"
                  style={{
                    top: `${top}px`,
                    height: `${height}px`,
                    ['--event-color' as any]: ev.color,
                  }}
                  onClick={(e) => {
                      e.stopPropagation();
                      onEditEvent(ev);
                  }}
                >
                  <div className="event-header">
                      <span className="event-title">{ev.title}</span>
                      <span className="event-icon">{getEventIcon(ev.type)}</span>
                  </div>
                  
                  <div className="event-meta">
                      <span className="event-time">
                        {ev.start}:00 - {ev.end}:00
                      </span>
                      <span className="event-duration">
                          {(ev.end - ev.start)}h
                      </span>
                  </div>

                  {ev.description && (height > 60) && (
                      <div className="event-desc">
                          {ev.description}
                      </div>
                  )}
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

  const MOCK_MODE = true;
  const displayTime = useMemo(() => {
      if (MOCK_MODE) {
          const d = new Date();
          const currentDay = d.getDay();
          const distanceToMon = 1 - currentDay; // Force Monday
          d.setDate(d.getDate() + distanceToMon);
          d.setHours(10, 30, 0, 0);
          return d;
      }
      return now;
  }, [now]);

  const currentHour = displayTime.getHours();
  const currentMinute = displayTime.getMinutes();
  const startHour = 0;
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
