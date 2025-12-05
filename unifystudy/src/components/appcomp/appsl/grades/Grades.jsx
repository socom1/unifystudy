import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import "./Grades.scss";

export default function Grades() {
  const [userId, setUserId] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Assessment form
  const [assessName, setAssessName] = useState("");
  const [assessScore, setAssessScore] = useState("");
  const [assessTotal, setAssessTotal] = useState("100");
  const [assessWeight, setAssessWeight] = useState("1.0");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

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

  return (
    <div className="grades-root">
      <header className="grades-header">
        <div className="header-content">
          <h1>Academic Tracker</h1>
          <div className="gpa-badge">
            <span className="label">Overall Average</span>
            <span className="value">{overallGPA()}%</span>
          </div>
        </div>
      </header>

      <div className="grades-container">
        {/* Sidebar: Subjects List */}
        <div className="subjects-sidebar">
          <form onSubmit={addSubject} className="add-subject-form">
            <input
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              placeholder="New Subject (e.g. Math)"
            />
            <button type="submit" className="add-subject-btn">
              +
            </button>
          </form>

          <div className="subjects-list">
            {subjects.map((sub) => {
              const avg = calculateAverage(sub.assessments);
              return (
                <div
                  key={sub.id}
                  className={`subject-card ${
                    selectedSubject?.id === sub.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedSubject(sub)}
                >
                  <div className="sub-info">
                    <h3>{sub.name}</h3>
                    <span className="sub-avg">
                      {avg}% ({getLetterGrade(avg)})
                    </span>
                  </div>
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSubject(sub.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Main: Assessments */}
        <div className="assessments-panel">
          {selectedSubject ? (
            <>
              <div className="panel-header">
                <h2>{selectedSubject.name}</h2>
                <div className="stats">
                  <div className="stat">
                    <span className="label">Average</span>
                    <span className="val">
                      {calculateAverage(selectedSubject.assessments)}%
                    </span>
                  </div>
                  <div className="stat">
                    <span className="label">Grade</span>
                    <span className="val">
                      {getLetterGrade(
                        calculateAverage(selectedSubject.assessments)
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="assessments-list">
                <AnimatePresence>
                  {selectedSubject.assessments.map((a) => (
                    <motion.div
                      key={a.id}
                      className="assessment-item"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <div className="a-info">
                        <h4>{a.name}</h4>
                        <span className="a-date">
                          {new Date(a.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="a-score">
                        <span className="score-val">
                          {a.score}/{a.total}
                        </span>
                        <span className="percentage">
                          {((a.score / a.total) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="a-weight">Weight: {a.weight}x</div>
                      <button
                        onClick={() => deleteAssessment(a.id)}
                        className="del-btn"
                      >
                        ×
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <form onSubmit={addAssessment} className="add-assessment-form">
                <input
                  placeholder="Assessment Name"
                  value={assessName}
                  onChange={(e) => setAssessName(e.target.value)}
                  required
                />
                <div className="row">
                  <input
                    type="number"
                    placeholder="Score"
                    value={assessScore}
                    onChange={(e) => setAssessScore(e.target.value)}
                    required
                  />
                  <span>/</span>
                  <input
                    type="number"
                    placeholder="Total"
                    value={assessTotal}
                    onChange={(e) => setAssessTotal(e.target.value)}
                    required
                  />
                </div>
                <div className="row weight-row">
                  <label>Weight:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={assessWeight}
                    onChange={(e) => setAssessWeight(e.target.value)}
                  />
                </div>
                <button type="submit">Add Grade</button>
              </form>
            </>
          ) : (
            <div className="empty-selection">
              <p>Select a subject to view grades</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
