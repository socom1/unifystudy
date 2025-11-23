import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./pomodoro.scss";
import { useTimer } from "./TimerContext";

export default function Pomodoro() {
  const {
    templateList,
    setTemplateList,
    selectedTemplateId,
    setSelectedTemplateId,
    selectedTemplate,
    mode,
    setMode,
    running,
    startPause,
    reset,
    secondsLeft,
    totalSeconds,
    completedPomodoros,
    formatTime,
  } = useTimer();

  // editor UI (Local state is fine for editor)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState(
    templateList
      .map(
        (t) =>
          `// ${t.name}\nwork: ${t.work}\nshort: ${t.short}\nlong: ${t.long}\ncycles: ${t.cycles}\n`
      )
      .join("\n\n")
  );
  const editorScrollRef = useRef(null);

  // markers
  const MARKERS = 24;
  const markers = useMemo(() => {
    const arr = [];
    for (let i = 0; i < MARKERS; i++) {
      const angle = (360 / MARKERS) * i;
      arr.push({ i, angle });
    }
    return arr;
  }, []);

  // circumference constant (r = 100 matches CSS/SVG)
  const CIRC = 2 * Math.PI * 100;

  // progress percent (smooth because secondsLeft is float)
  const progressPercent = Math.max(
    0,
    Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100)
  );

  // Apply template
  const applyTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
  };

  // Editor save
  const saveEditor = () => {
    const blocks = editorContent
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
    const parsed = blocks.map((b, i) => {
      const lines = b
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const nameLine = lines[0] || `Template ${i + 1}`;
      const name = nameLine.replace(/^\/\/\s*/, "");
      const obj = {
        id: `t_editor_${i}`,
        name,
        work: 25,
        short: 5,
        long: 15,
        cycles: 4,
      };
      lines.slice(1).forEach((l) => {
        const m = l.match(/^(\w+)\s*:\s*(\d+)/);
        if (m) obj[m[1]] = Number(m[2]);
      });
      return obj;
    });
    if (parsed.length) {
      setTemplateList(parsed);
      setSelectedTemplateId(parsed[0].id);
    }
    setEditorOpen(false);
  };

  // editor line numbers
  const editorLines = useMemo(() => editorContent.split("\n"), [editorContent]);
  const timerClass = running ? "timer running" : "timer";

  return (
    <div className="pom-root">
      <main className="main">
        {/* Timer card */}
        <section className={timerClass} aria-live="polite">
          <div className="timer__status">
            <div className="left">
              <span className="dot" />
              <span style={{ marginLeft: 8 }}>
                {mode === "work"
                  ? "Focus"
                  : mode === "short"
                  ? "Short Break"
                  : "Long Break"}
              </span>
            </div>

            <div className="right">
              <span style={{ marginRight: 12 }}>
                <strong>{completedPomodoros}</strong> done
              </span>
              <span className="muted-text">
                Next:{" "}
                {mode === "work"
                  ? (selectedTemplate?.short || 5) + "m break"
                  : "Work"}
              </span>
            </div>
          </div>

          <div className="timer__circle">
            <svg
              className="timer__svg"
              width="240"
              height="240"
              viewBox="0 0 240 240"
            >
              {/* Gradient */}
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--color-primary)" />
                  <stop offset="100%" stopColor="var(--color-secondary)" />
                </linearGradient>
              </defs>

              {/* Background ring */}
              <circle
                className="circle-bg"
                cx="120"
                cy="120"
                r="100"
                strokeWidth="14"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
              />

              {/* Progress ring */}
              <circle
                className="circle-progress"
                cx="120"
                cy="120"
                r="100"
                strokeWidth="14"
                fill="none"
                stroke="url(#grad)"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progressPercent / 100)}
                strokeLinecap="round"
                style={{ transition: "none" }}
              />
            </svg>

            {/* markers */}
            {markers.map((m) => (
              <div
                key={m.i}
                className="marker"
                style={{
                  transform: `rotate(${m.angle}deg) translate(0, -118px) rotate(-${m.angle}deg)`,
                }}
              />
            ))}

            <div className="timer__center">
              <div className="timer__time">{formatTime(secondsLeft)}</div>
              <div className="timer__sub">{selectedTemplate?.name}</div>
            </div>
          </div>

          {/* controls */}
          <div className="timer__controls">
            <button className="primary" onClick={startPause}>
              {running ? "Pause" : "Start"}
            </button>
            <button onClick={reset}>Reset</button>
            <button onClick={() => setMode("work")}>Jump to Work</button>
            <button onClick={() => setMode("short")}>Short Break</button>
            <button onClick={() => setMode("long")}>Long Break</button>
          </div>

          <div className="timer__progress-bar" aria-hidden>
            <div
              className="progress-bar__fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* Templates area */}
        <section className="templates">
          <div className="templates__header">
            <h2>Templates</h2>
            <div className="actions">
              <button onClick={() => setEditorOpen(true)}>Open Editor</button>
              <button
                onClick={() => {
                  if (selectedTemplate) applyTemplate(selectedTemplate);
                }}
              >
                Apply
              </button>
            </div>
          </div>

          <div className="templates__list">
            {templateList.map((tpl) => (
              <div className="template-item" key={tpl.id}>
                <div>
                  <div style={{ fontWeight: 700 }}>{tpl.name}</div>
                  <div className="meta">
                    work: {tpl.work}m • short: {tpl.short}m • long: {tpl.long}m
                    • cycles: {tpl.cycles}
                  </div>
                </div>
                <div className="template-actions">
                  <button onClick={() => setSelectedTemplateId(tpl.id)}>
                    Select
                  </button>
                  <button onClick={() => applyTemplate(tpl)}>Use</button>
                </div>
              </div>
            ))}
          </div>

          <div className="quick-bar">
            <button
              className={`quick-bar__btn ${mode === "work" ? "active" : ""}`}
              onClick={() => setMode("work")}
            >
              Work
            </button>
            <button
              className={`quick-bar__btn ${mode === "short" ? "active" : ""}`}
              onClick={() => setMode("short")}
            >
              Short
            </button>
            <button
              className={`quick-bar__btn ${mode === "long" ? "active" : ""}`}
              onClick={() => setMode("long")}
            >
              Long
            </button>
          </div>
        </section>
      </main>

      {/* Editor modal */}
      <AnimatePresence>
        {editorOpen && (
          <motion.div
            className="templates__editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  marginTop: 12.5,
                  width: 60,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: 20,
                    fontSize: 12,
                    color: "var(--color-muted)",
                    textAlign: "center",
                    height: "auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  Line
                </div>
                <div
                  ref={editorScrollRef}
                  style={{
                    maxHeight: 380,
                    overflowY: "auto",
                    lineHeight: "1.6",
                    paddingTop: 12,
                    paddingBottom: 12,
                    paddingRight: 8,
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    background: "rgba(255, 255, 255, 0.02)",
                    borderRadius: 6,
                    paddingLeft: 8,
                  }}
                  className="line-numbers-scrollable"
                >
                  {editorLines.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        padding: 0,
                        textAlign: "center",
                        opacity: 0.7,
                        fontSize: 13,
                        lineHeight: "1.6",
                        fontFamily: '"Fira Code", monospace',
                        height: "auto",
                        color: "var(--color-muted)",
                      }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ color: "var(--muted)" }}>
                    Templates Editor (simple format)
                  </div>
                  <div>
                    <button onClick={() => setEditorOpen(false)}>Close</button>
                    <button style={{ marginLeft: 8 }} onClick={saveEditor}>
                      Save
                    </button>
                  </div>
                </div>

                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  onScroll={(e) => {
                    if (editorScrollRef.current) {
                      editorScrollRef.current.scrollTop = e.target.scrollTop;
                    }
                  }}
                  style={{
                    width: "100%",
                    height: 380,
                    background: "var(--color-bg-dark)",
                    color: "var(--color-secondary)",
                    border: "1px solid rgba(255,255,255,0.03)",
                    padding: 12,
                    borderRadius: 6,
                    fontFamily: '"Fira Code", monospace',
                    fontSize: 13,
                    lineHeight: "1.6",
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
