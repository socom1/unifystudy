import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./pomodoro.scss";

const breakSound = new Audio("/sounds/break-chime.mp3");
const studySound = new Audio("/sounds/study-chime.mp3");

const Pomodoro = () => {
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [selectedDuration, setSelectedDuration] = useState(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeButton, setActiveButton] = useState(null);
  const [fadeKey, setFadeKey] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newSegments, setNewSegments] = useState([
    { type: "study", duration: 10 },
  ]);
  const [editIndex, setEditIndex] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("Quick Timer");

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    let id;
    if (isRunning && timeLeft > 0) {
      id = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            setIsRunning(false);
            if (currentTemplate) {
              const nextIndex = currentSegmentIndex + 1;
              if (nextIndex < currentTemplate.segments.length) {
                const nextSeg = currentTemplate.segments[nextIndex];
                setCurrentSegmentIndex(nextIndex);
                setSelectedDuration(nextSeg.duration * 60);
                setTimeLeft(nextSeg.duration * 60);
                setCurrentTitle(
                  `${currentTemplate.name} - ${
                    nextSeg.type === "study" ? "Study" : "Break"
                  }`
                );
                setIsRunning(true);
                if (nextSeg.type === "break") breakSound.play();
                else studySound.play();
              } else {
                setCurrentTemplate(null);
                setCurrentSegmentIndex(0);
                setCurrentTitle("Quick Timer");
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(id);
  }, [isRunning, timeLeft, currentTemplate, currentSegmentIndex]);

  const handleSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    const updatedTemplates = [...templates];
    if (editIndex !== null) {
      updatedTemplates[editIndex] = {
        name: newTemplateName,
        segments: newSegments,
      };
    } else {
      updatedTemplates.push({ name: newTemplateName, segments: newSegments });
    }
    setTemplates(updatedTemplates);
    setNewTemplateName("");
    setNewSegments([{ type: "study", duration: 10 }]);
    setEditIndex(null);
    setShowTemplateEditor(false);
  };

  const circleRadius = 90;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const dashOffset = circleCircumference * (1 - timeLeft / selectedDuration);

  return (
    <div className="app">
      <motion.footer
        className="quick-bar"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {[5, 10, 15, 25, 50, 60].map((min) => (
          <motion.button
            key={min}
            className={`quick-bar__btn ${activeButton === min ? "active" : ""}`}
            onClick={() => {
              setIsRunning(false);
              const secs = min * 60;
              setSelectedDuration(secs);
              setTimeLeft(secs);
              setFadeKey((k) => k + 1);
              setActiveButton(min);
              setCurrentTemplate(null);
              setCurrentTitle("Quick Timer");
              studySound.play();
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {min}m
          </motion.button>
        ))}
      </motion.footer>
      <motion.header
        className="header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      ></motion.header>

      <main className="main">
        <motion.section
          className="timer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h2 className="timer__title">{currentTitle}</h2>
          <motion.div
            className="timer__circle"
            animate={{ scale: isRunning ? 1.05 : 1 }}
          >
            <svg width="200" height="200">
              <circle
                className="circle-bg"
                cx="100"
                cy="100"
                r={circleRadius}
                strokeWidth="10"
                fill="none"
              />
              <motion.circle
                className="circle-progress"
                cx="100"
                cy="100"
                r={circleRadius}
                strokeWidth="10"
                fill="none"
                strokeDasharray={circleCircumference}
                strokeDashoffset={dashOffset}
                animate={{
                  strokeDashoffset: dashOffset,
                  stroke:
                    currentTemplate &&
                    currentTemplate.segments[currentSegmentIndex]?.type ===
                      "break"
                      ? "#bf4040"
                      : "#4b6c82",
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </svg>
            <AnimatePresence mode="wait">
              <motion.p
                key={fadeKey}
                className="timer__time"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                {formatTime(timeLeft)}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          <motion.div
            className="timer__controls"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRunning(true)}
            >
              Start
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsRunning(false)}
            >
              Stop
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setIsRunning(false);
                setTimeLeft(selectedDuration);
                setFadeKey((k) => k + 1);
              }}
            >
              Reset
            </motion.button>
          </motion.div>

          {currentTemplate && (
            <div className="timer__progress-bar">
              <motion.div
                className="progress-bar__fill"
                initial={{ width: "0%" }}
                animate={{
                  width: `${
                    ((selectedDuration - timeLeft) / selectedDuration) * 100
                  }%`,
                }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  backgroundColor:
                    currentTemplate.segments[currentSegmentIndex]?.type ===
                    "break"
                      ? "#bf4040"
                      : "#7bbf59",
                }}
              />
            </div>
          )}
        </motion.section>

        {/* Templates Section */}
        <motion.section className="templates" layout="position">
          <div className="templates__header">
            <h2>Templates</h2>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowTemplateEditor(!showTemplateEditor);
                setEditIndex(null);
                setNewTemplateName("");
                setNewSegments([{ type: "study", duration: 10 }]);
              }}
            >
              {showTemplateEditor ? "Close Editor" : "Add Template"}
            </motion.button>
          </div>

          <AnimatePresence>
            {showTemplateEditor && (
              <motion.div
                className="templates__editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                layout="position"
              >
                <input
                  placeholder="Template Name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
                <div className="templates__segments">
                  {newSegments.map((seg, idx) => (
                    <motion.div
                      key={idx}
                      className="segment-row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      layout
                    >
                      <select
                        value={seg.type}
                        onChange={(e) => {
                          const updated = [...newSegments];
                          updated[idx].type = e.target.value;
                          setNewSegments(updated);
                        }}
                      >
                        <option value="study">Study</option>
                        <option value="break">Break</option>
                      </select>
                      <input
                        type="number"
                        value={seg.duration}
                        onChange={(e) => {
                          const updated = [...newSegments];
                          updated[idx].duration = parseInt(e.target.value);
                          setNewSegments(updated);
                        }}
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const updated = [...newSegments];
                          updated.splice(idx, 1);
                          setNewSegments(updated);
                        }}
                      >
                        Remove
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    setNewSegments([
                      ...newSegments,
                      { type: "study", duration: 10 },
                    ])
                  }
                >
                  Add Segment
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveTemplate}
                >
                  {editIndex !== null ? "Update Template" : "Save Template"}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div className="templates__list" layout="position">
            <ul>
              {templates.map((temp, idx) => (
                <motion.li
                  key={idx}
                  className="template-item"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  layout="position"
                >
                  <div>
                    <strong>{temp.name}</strong>
                    <small>
                      {temp.segments
                        .map((s) => `${s.type} ${s.duration}m`)
                        .join(" - ")}
                    </small>
                  </div>
                  <div className="template-actions">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (!temp.segments.length) return;
                        setCurrentTemplate(temp);
                        setCurrentSegmentIndex(0);
                        const first = temp.segments[0];
                        setSelectedDuration(first.duration * 60);
                        setTimeLeft(first.duration * 60);
                        setCurrentTitle(
                          `${temp.name} - ${
                            first.type === "study" ? "Study" : "Break"
                          }`
                        );
                        setActiveButton(null);
                        setIsRunning(true);
                        if (first.type === "break") breakSound.play();
                        else studySound.play();
                      }}
                    >
                      Apply
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setShowTemplateEditor(true);
                        setNewTemplateName(temp.name);
                        setNewSegments([...temp.segments]);
                        setEditIndex(idx);
                      }}
                    >
                      Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        const updated = [...templates];
                        updated.splice(idx, 1);
                        setTemplates(updated);
                      }}
                    >
                      Delete
                    </motion.button>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
};

export default Pomodoro;
