// @ts-nocheck
import React, { useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./pomodoro.scss";
import { useTimer } from "./TimerContext";

export default function Pomodoro({ zenMode = false }) {
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
    showClaimModal, // New
    confirmClaim,   // New
  } = useTimer();

  // editor UI (Local state is fine for editor)
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectorMode, setSelectorMode] = useState(
    typeof window !== 'undefined' && window.innerWidth < 768
  ); // Auto-detect mobile
  const [editorContent, setEditorContent] = useState(
    templateList
      .map(
        (t) =>
          `// ${t.name}\nwork: ${t.work}\nshort: ${t.short}\nlong: ${t.long}\ncycles: ${t.cycles}\n`
      )
      .join("\n\n")
  );
  const editorScrollRef = useRef(null);

  // Selector mode template state
  const [selectorTemplate, setSelectorTemplate] = useState({
    name: "Custom Template",
    work: 25,
    short: 5,
    long: 15,
    cycles: 4,
  });

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

  // Save selector template
  const saveSelectorTemplate = () => {
    const newTemplate = {
      ...selectorTemplate,
      id: `selector_${Date.now()}`,
    };
    setTemplateList([...templateList, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setEditorOpen(false);
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
    <div className={`pom-root ${zenMode ? "zen-layout" : ""}`}>
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

        {/* Templates area (Hidden in Zen Mode) */}
        {!zenMode && (
        <section className="templates">
          <div className="templates__header">
            <h2>Templates</h2>
            <div className="actions">
              <button 
                onClick={() => setSelectorMode(!selectorMode)}
                className="mode-toggle"
              >
                {selectorMode ? "🎹 Typing Mode" : "🎛️ Selector Mode"}
              </button>
              <button onClick={() => setEditorOpen(true)}>
                {selectorMode ? "Quick Edit" : "Open Editor"}
              </button>
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
        )}

        {/* ZEN MODE TEMPLATES (Simplified) */}
        {zenMode && (
          <motion.div 
            className="zen-templates"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <h3 className="zen-templates-label">Templates</h3>
            <div className="zen-templates-list">
            {templateList.map((tpl) => (
              <button
                key={tpl.id}
                className={`zen-template-pill ${selectedTemplateId === tpl.id ? "active" : ""}`}
                onClick={() => setSelectedTemplateId(tpl.id)}
              >
                {tpl.name}
              </button>
            ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* Editor/Selector modal */}
      <AnimatePresence>
        {editorOpen && (
          <motion.div
            className="templates__editor"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            {/* ... editor content ... */}
            {selectorMode ? (
              /* Selector Mode UI */
              <div className="selector-mode">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h3>Create Template (Selector Mode)</h3>
                  <div>
                    <button onClick={() => setEditorOpen(false)}>Close</button>
                    <button style={{ marginLeft: 8 }} onClick={saveSelectorTemplate}>
                      Save
                    </button>
                  </div>
                </div>
                
                <div className="selector-inputs">
                  <div className="input-group">
                    <label>Template Name</label>
                    <input
                      type="text"
                      value={selectorTemplate.name}
                      onChange={(e) => setSelectorTemplate({ ...selectorTemplate, name: e.target.value })}
                      placeholder="My Custom Template"
                    />
                  </div>
                  
                  <div className="input-row">
                    <div className="input-group">
                      <label>Work Duration (min)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={selectorTemplate.work}
                        onChange={(e) => setSelectorTemplate({ ...selectorTemplate, work: parseInt(e.target.value) || 25 })}
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>Short Break (min)</label>
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={selectorTemplate.short}
                        onChange={(e) => setSelectorTemplate({ ...selectorTemplate, short: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                  
                  <div className="input-row">
                    <div className="input-group">
                      <label>Long Break (min)</label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={selectorTemplate.long}
                        onChange={(e) => setSelectorTemplate({ ...selectorTemplate, long: parseInt(e.target.value) || 15 })}
                      />
                    </div>
                    
                    <div className="input-group">
                      <label>Cycles</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={selectorTemplate.cycles}
                        onChange={(e) => setSelectorTemplate({ ...selectorTemplate, cycles: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Typing Mode UI (Original) */
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
            )}
          </motion.div>
        )}

        {/* --- ANTI-ABUSE CLAIM MODAL --- */}
        {showClaimModal && (
          <motion.div
             className="modal-overlay"
             style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
                zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
          >
             <motion.div
                className="claim-modal"
                style={{
                    background: 'var(--color-bg-card)',
                    padding: '2rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    textAlign: 'center',
                    maxWidth: '400px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
             >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h2 style={{ lineHeight: 1.2, marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Session Complete!</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
                    Confirm you are still here to claim your Lumens and XP.
                </p>
                <button 
                    onClick={confirmClaim}
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '100%'
                    }}
                >
                    I'm Here! Claim Rewards 💰
                </button>
             </motion.div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
