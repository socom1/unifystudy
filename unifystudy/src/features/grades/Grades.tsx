
// @ts-nocheck
import React, { useState, useEffect } from "react";
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from 'react-router-dom';
import { useUI } from "@/context/UIContext"; // Import useUI
import { 
  GraduationCap, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  MoreVertical, 
  Plus, 
  Trash2, 
  TrendingUp, 
  AlertCircle,
  Clock,
  ArrowRight,
  ChevronLeft // Import ChevronLeft
} from "lucide-react";
import "./Grades.scss";

export default function SubjectHub() {
  const { isMobile } = useUI(); // Get isMobile
  const [userId, setUserId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  // Hub Data
  const [allTasks, setAllTasks] = useState([]);
  const [foldersData, setFoldersData] = useState({}); // New: Store folders for writing
  const [calendarEvents, setCalendarEvents] = useState([]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0, transition: { duration: 0.3 } }
  };

  // Assessment form
  const [assessName, setAssessName] = useState("");
  const [assessScore, setAssessScore] = useState("");
  const [assessTotal, setAssessTotal] = useState("100");
  const [assessWeight, setAssessWeight] = useState("1.0");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  // 1. Fetch Grades (Subjects)
  useEffect(() => {
    if (!userId) return;
    const gradesRef = ref(db, `users/${userId}/grades`);
    const unsub = onValue(gradesRef, (snap) => {
      const data = snap.val();
      if (data) {
        const arr = Object.entries(data).map(([id, val]) => ({
          id,
          ...val,
          assessments: val.assessments
            ? Object.entries(val.assessments).map(([aid, aval]) => ({
                id: aid,
                ...aval,
              }))
            : [],
        }));
        setSubjects(arr);
      } else {
        setSubjects([]);
      }
    });
    return () => unsub();
  }, [userId]);

  // 2. Fetch Tasks for Linking
  useEffect(() => {
    if (!userId) return;
    const foldersRef = ref(db, `users/${userId}/folders`);
    const unsub = onValue(foldersRef, (snap) => {
      const data = snap.val();
      if (data) {
        const tasks = [];
        Object.values(data).forEach(folder => {
          if (folder.tasks) {
            Object.values(folder.tasks).forEach(task => {
              if (!task.isActive) { // Only active active (not completed) tasks
                tasks.push({
                  ...task,
                  folderName: folder.text
                });
              }
            });
          }
        });
        setAllTasks(tasks);
        setFoldersData(data); // Store full folders object
      }
    });
    return () => unsub();
  }, [userId]);

  // 3. Fetch Calendar Events (LocalStorage)
  useEffect(() => {
    const loadEvents = () => {
      const stored = localStorage.getItem('calendar-events');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCalendarEvents(Array.isArray(parsed) ? parsed : []);
        } catch (e) { console.error(e); }
      }
    };
    loadEvents();
    window.addEventListener('storage', loadEvents); 
    return () => window.removeEventListener('storage', loadEvents);
  }, []);


  const addSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim() || !userId) return;
    const newRef = push(ref(db, `users/${userId}/grades`));
    await set(newRef, { name: newSubjectName, assessments: {} });
    setNewSubjectName("");
  };

  const deleteSubject = async (id) => {
    if (!confirm("Delete this subject and all its grades?")) return;
    await remove(ref(db, `users/${userId}/grades/${id}`));
    if (selectedSubject?.id === id) setSelectedSubject(null);
  };

  const addAssessment = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !assessName.trim() || !userId) return;

    const score = parseFloat(assessScore);
    const total = parseFloat(assessTotal);
    const weight = parseFloat(assessWeight);

    if (isNaN(score) || isNaN(total) || isNaN(weight)) return;

    const newRef = push(
      ref(db, `users/${userId}/grades/${selectedSubject.id}/assessments`)
    );
    await set(newRef, {
      name: assessName,
      score,
      total,
      weight,
      date: Date.now(),
    });

    setAssessName("");
    setAssessScore("");
    setAssessTotal("100");
    setAssessWeight("1.0");
  };

  const deleteAssessment = async (aid) => {
    if (!selectedSubject || !userId) return;
    await remove(
      ref(db, `users/${userId}/grades/${selectedSubject.id}/assessments/${aid}`)
    );
  };

  // Calculations
  const calculateAverage = (assessments) => {
    if (!assessments || assessments.length === 0) return 0;
    let totalWeightedScore = 0;
    let totalWeight = 0;

    assessments.forEach((a) => {
      const percentage = (a.score / a.total) * 100;
      totalWeightedScore += percentage * a.weight;
      totalWeight += a.weight;
    });

    return totalWeight === 0
      ? 0
      : (totalWeightedScore / totalWeight).toFixed(1);
  };

  const getLetterGrade = (avg) => {
    if (avg >= 97) return "A+";
    if (avg >= 93) return "A";
    if (avg >= 90) return "A-";
    if (avg >= 87) return "B+";
    if (avg >= 83) return "B";
    if (avg >= 80) return "B-";
    if (avg >= 77) return "C+";
    if (avg >= 73) return "C";
    if (avg >= 70) return "C-";
    if (avg >= 67) return "D+";
    if (avg >= 63) return "D";
    if (avg >= 60) return "D-";
    return "F";
  };

  const overallGPA = () => {
    if (subjects.length === 0) return 0;
    let sum = 0;
    let count = 0;
    subjects.forEach((s) => {
      const avg = parseFloat(calculateAverage(s.assessments));
      if (avg > 0) {
        sum += avg;
        count++;
      }
    });
    return count === 0 ? 0 : (sum / count).toFixed(1);
  };

  // --- Filtering Linked Data ---
  const getLinkedTasks = (subjectName) => {
    if (!subjectName) return [];
    const lowerName = subjectName.toLowerCase();
    return allTasks.filter(t => 
      (t.folderName && t.folderName.toLowerCase().includes(lowerName)) ||
      (t.tags && t.tags.some(tag => tag.label.toLowerCase().includes(lowerName))) ||
      t.text.toLowerCase().includes(lowerName)
    );
  };

  const getLinkedEvents = (subjectName) => {
    if (!subjectName) return [];
    const lowerName = subjectName.toLowerCase();
    const now = new Date();
    return calendarEvents.filter(e => {
        // Match by explicitly linked Subject ID (Best match)
        // Or fallback to fuzzy name match
        const isLinked = e.subjectId === (selectedSubject.id || selectedSubject.key); // handle both id formats if needed
        const nameMatch = e.name && e.name.toLowerCase().includes(lowerName);
        
        const match = isLinked || nameMatch;
        
        // Filter out past events
        let isFuture = true;
        if (e.month !== undefined && e.day !== undefined) {
             const eventDate = new Date(new Date().getFullYear(), e.month, e.day);
             // handle year rollover coarsely
             if (e.month < now.getMonth() && now.getMonth() > 9) {
                 eventDate.setFullYear(now.getFullYear() + 1);
             }
             // Allow today's events
             const today = new Date();
             today.setHours(0,0,0,0);
             isFuture = eventDate >= today;
        }
        return match && isFuture;
    }).sort((a, b) => {
        // Sort by date 
        const yearA = new Date().getFullYear() + (a.month < now.getMonth() && now.getMonth() > 9 ? 1 : 0);
        const yearB = new Date().getFullYear() + (b.month < now.getMonth() && now.getMonth() > 9 ? 1 : 0);
        const dateA = new Date(yearA, a.month, a.day);
        const dateB = new Date(yearB, b.month, b.day);
        return dateA - dateB;
    });
  };

  // --- Actions ---
  const addLinkedTask = () => {
      navigate('/todo');
  };

  const addLinkedEvent = () => {
      if (!selectedSubject) return;
      navigate('/calendar', { 
          state: { 
              autoOpenModal: true, 
              initialEventSubject: selectedSubject.id 
          } 
      });
  };

  return (
    <div className="grades-root">
      <header className="grades-header">
        <div className="header-content">
            {/* Mobile Back Button in Header (Optional, or put in panel) */}
            {isMobile && selectedSubject && (
                <button 
                    onClick={() => setSelectedSubject(null)}
                    className="mobile-back-btn"
                >
                    <ChevronLeft size={24} />
                </button>
            )}
          <h1 style={{fontSize: isMobile ? '1.4rem' : '1.8rem'}}>Subject Master Hub</h1>
          <div className="gpa-badge">
            <span className="label">GPA</span>
            <span className="value">{overallGPA()}%</span>
          </div>
        </div>
      </header>

      <div className="grades-container">
        {/* Sidebar: Subjects List - Show if Desktop OR (Mobile & No Selection) */}
        {(!isMobile || !selectedSubject) && (
            <div className="subjects-sidebar">
              <form onSubmit={addSubject} className="add-subject-form">
                <input
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="New Subject..."
                />
                <button type="submit" className="add-subject-btn">
                  <Plus size={18} />
                </button>
              </form>

              <motion.div className="subjects-list" variants={containerVariants} initial="hidden" animate="show">
                {subjects.map((sub) => {
                  const avg = calculateAverage(sub.assessments);
                  return (
                    <motion.div
                      key={sub.id}
                      variants={itemVariants}
                      className={`subject-card ${
                        selectedSubject?.id === sub.id ? "active" : ""
                      }`}
                      onClick={() => setSelectedSubject(sub)}
                    >
                      <div className="sub-icon">
                        <GraduationCap size={20} />
                      </div>
                      <div className="sub-info">
                        <h3>{sub.name}</h3>
                        <span className="sub-avg">
                          {avg}% {getLetterGrade(avg)}
                        </span>
                      </div>
                      {/* Mobile Arrow Indicator */}
                      {isMobile && <ArrowRight size={16} style={{marginLeft:'auto', opacity:0.5}} />}
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
        )}

        {/* Main: Dashboard - Show if Desktop OR (Mobile & Selection) */}
        {(!isMobile || selectedSubject) && (
            <div className="assessments-panel">
              {selectedSubject ? (
                <div className="subject-dashboard">
                  <header className="panel-header">
                    <div className="title-group">
                       {/* Mobile Back Button in Panel Header (Better placement) */}
                       {isMobile && (
                           <button onClick={() => setSelectedSubject(null)} className="mobile-back-btn panel-back">
                               <ChevronLeft size={20}/>
                           </button>
                       )}
                      <h2>{selectedSubject.name}</h2>
                      <div className="grade-pill">
                        {calculateAverage(selectedSubject.assessments)}% ({getLetterGrade(calculateAverage(selectedSubject.assessments))})
                      </div>
                    </div>
                    
                    <button className="delete-sub-btn" onClick={() => deleteSubject(selectedSubject.id)} title="Delete Subject">
                        <Trash2 size={16} />
                    </button>
                  </header>

                  <div className="dashboard-grid">
                      {/* LEFT COL: Stats & Exams */}
                      <div className="col-main">
                          {/* Grade Details */}
                          <section className="dashboard-card grades-card">
                              <div className="card-header">
                                  <h3><TrendingUp size={16} /> Performance</h3>
                                  <span className="score-big">{calculateAverage(selectedSubject.assessments)}%</span>
                              </div>
                          
                              <div className="assessments-list">
                                  <AnimatePresence>
                                    {selectedSubject.assessments.length === 0 && <div className="empty-msg">No grades recorded yet.</div>}
                                    {selectedSubject.assessments.map((a) => (
                                        <motion.div
                                        key={a.id}
                                        className="assessment-row"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        >
                                            <div className="a-info">
                                              <span className="a-name">{a.name}</span>
                                              <span className="a-weight-tag">{a.weight}x</span>
                                            </div>
                                            <div className="a-score">
                                              <span>{a.score}/{a.total}</span>
                                              <button onClick={() => deleteAssessment(a.id)} className="a-del"><Trash2 size={12}/></button>
                                            </div>
                                        </motion.div>
                                    ))}
                                  </AnimatePresence>
                              </div>
                                <form onSubmit={addAssessment} className="quick-add-grade">
                                    <input placeholder="Quiz Name" value={assessName} onChange={e => setAssessName(e.target.value)} required />
                                    <div className="score-inputs">
                                      <input type="number" placeholder="Score" value={assessScore} onChange={e => setAssessScore(e.target.value)} required />
                                      <span>/</span>
                                      <input type="number" placeholder="Total" value={assessTotal} onChange={e => setAssessTotal(e.target.value)} required />
                                    </div>
                                    <button type="submit"><Plus size={14}/></button>
                                </form>
                          </section>
    
                           {/* Upcoming Exams */}
                          <section className="dashboard-card exams-card">
                              <div className="card-header">
                                 <h3><CalendarIcon size={16} /> Upcoming Events</h3>
                                 <button onClick={addLinkedEvent} className="icon-btn-small" title="Add Event">
                                     <Plus size={14} />
                                 </button>
                              </div>
                              <div className="linked-list">
                                  {getLinkedEvents(selectedSubject.name).length === 0 ? (
                                      <div className="empty-linked">
                                          No upcoming exams found for "{selectedSubject.name}".
                                          <button onClick={addLinkedEvent} className="link-action">Add Exam</button>
                                      </div>
                                  ) : (
                                      getLinkedEvents(selectedSubject.name).map((ev, i) => (
                                          <div key={i} className={`linked-item event ${ev.type}`}>
                                              <div className="li-icon"><Clock size={14}/></div>
                                              <div className="li-content">
                                                  <span className="li-title">{ev.name}</span>
                                                  <span className="li-meta">{ev.type} • {ev.month + 1}/{ev.day}</span>
                                              </div>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </section>
                      </div>
    
                      {/* RIGHT COL: Tasks & Resources */}
                      <div className="col-side">
                          {/* Linked Tasks */}
                          <section className="dashboard-card tasks-card">
                               <div className="card-header">
                                <h3><CheckSquare size={16} /> Pending Tasks</h3>
                                 <button onClick={addLinkedTask} className="icon-btn-small" title="Add Task">
                                     <Plus size={14} />
                                 </button>
                              </div>
                               <div className="linked-list">
                                  {getLinkedTasks(selectedSubject.name).length === 0 ? (
                                      <div className="empty-linked">
                                          No active tasks found for "{selectedSubject.name}".
                                          <button onClick={addLinkedTask} className="link-action">Add Task</button>
                                      </div>
                                  ) : (
                                      getLinkedTasks(selectedSubject.name).map((t, i) => (
                                          <div key={i} className="linked-item task">
                                              <div className="li-icon"><AlertCircle size={14}/></div>
                                               <div className="li-content">
                                                  <span className="li-title">{t.text}</span>
                                                  <span className="li-meta">In: {t.folderName}</span>
                                              </div>
                                          </div>
                                      ))
                                  )}
                              </div>
                          </section>
                      </div>
                  </div>
                </div>
              ) : (
                <div className="empty-selection">
                  <GraduationCap size={48} />
                  <p>Select a Subject to view its Hub</p>
                </div>
              )}
            </div>
        )}
      </div>
    </div>
  );
}
