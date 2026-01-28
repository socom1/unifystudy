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
    streak,         // New
  } = useTimer();

  // editor UI (Local state is fine for editor)
  const [editorOpen, setEditorOpen] = useState(false);
  const [focusInput, setFocusInput] = useState(""); // Focus Task State
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
  // Editor scroll ref
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

        {/* MIDDLE: GRID */}
        <div className="pomodoro-grid" style={zenMode ? { display: 'flex', justifyContent: 'center' } : {}}>
                {/* Timer card */}
                <section className={timerClass} aria-live="polite">
                

                {/* Hide Status Pill in Zen Mode */}
                {!zenMode && (
                    <div className="timer__status">
                        <div className="left" style={{display:'flex', gap:'8px', alignItems:'center'}}>
                        <span className="dot" />
                        <span>
                            {mode === "work"
                            ? "Focus Mode"
                            : mode === "short"
                            ? "Short Break"
                            : "Long Break"}
                        </span>
                        </div>
                    </div>
                )}

                <div className="timer__circle">
                    <svg className="timer__svg" width="300" height="300" viewBox="0 0 240 240">
                    {/* Background ring */}
                    <circle
                        className="circle-bg"
                        cx="120"
                        cy="120"
                        r="100"
                        fill="none"
                    />

                    {/* Progress ring */}
                    <circle
                        className="circle-progress"
                        cx="120"
                        cy="120"
                        r="100"
                        fill="none"
                        strokeDasharray={CIRC}
                        strokeDashoffset={CIRC * (1 - progressPercent / 100)}
                    />
                    </svg>
                    
                    {/* Markers */}
                    {markers.map((m) => (
                    <div
                        key={m.i}
                        className="marker"
                        style={{
                        position: 'absolute',
                        width: '2px', height: '6px',
                        background: 'rgba(255,255,255,0.1)',
                        left: '50%', top: '50%',
                        transform: `translate(-50%, -50%) rotate(${m.angle}deg) translate(0, -96px)`
                        }}
                    />
                    ))}

                    <div className="timer__center">
                    <div className="timer__time">{formatTime(secondsLeft)}</div>
                    <div className="timer__sub">
                        {zenMode 
                            ? (mode === "work" ? "Focus Mode" : mode === "short" ? "Short Break" : "Long Break")
                            : selectedTemplate?.name
                        }
                    </div>
                    </div>
                </div>

                {/* Session Progress Visualizer */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', justifyContent: 'center', opacity: zenMode ? 1 : 0.7 }}>
                    {Array.from({ length: Math.max(4, completedPomodoros + (mode === 'work' ? 1 : 0)) }).map((_, i) => (
                        <div 
                            key={i}
                            style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: i < completedPomodoros ? 'var(--color-primary)' : 'var(--glass-border)',
                                boxShadow: i < completedPomodoros ? '0 0 10px var(--color-primary)' : 'none',
                                transition: 'all 0.3s'
                            }}
                        />
                    ))}
                </div>

                {/* controls */}
                <div className="timer__controls">
                    <button className="primary" onClick={startPause}>
                    {running ? "Pause" : "Start Focus"}
                    </button>
                    <button onClick={reset}>Reset</button>
                </div>
                </section>

                {/* Templates area - Hide in Zen Mode */}
                {!zenMode && (
                    <section className="templates">
                        <div className="templates__header">
                            <h2>Sessions</h2>
                            <div className="actions">
                            <button onClick={() => setEditorOpen(true)}>Edit Templates</button>
                            </div>
                        </div>

                        <div className="templates__list">
                            {templateList.map((tpl) => (
                            <div 
                                className={`template-item ${selectedTemplateId === tpl.id ? 'active-template' : ''}`} 
                                key={tpl.id}
                                onClick={() => setSelectedTemplateId(tpl.id)}
                            >
                                <div>
                                <div style={{ fontWeight: 600, fontSize:'0.95rem', color: 'var(--color-text)' }}>{tpl.name}</div>
                                <div className="meta">
                                    {tpl.work}m Focus • {tpl.cycles} Cycles
                                </div>
                                </div>
                                {selectedTemplateId === tpl.id && (
                                    <div style={{color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600}}>Active</div>
                                )}
                            </div>
                            ))}
                        </div>

                        <div className="quick-bar">
                            <button className={`quick-bar__btn ${mode === "work" ? "active" : ""}`} onClick={() => setMode("work")}>Focus</button>
                            <button className={`quick-bar__btn ${mode === "short" ? "active" : ""}`} onClick={() => setMode("short")}>Short</button>
                            <button className={`quick-bar__btn ${mode === "long" ? "active" : ""}`} onClick={() => setMode("long")}>Long</button>
                        </div>
                    </section>
                )}
            </div>

        {/* BOTTOM: STATS - Show in Zen Mode too to fill space */}
        <div className="stats-section">
            <div className="stat-item">
                <span className="label">Sessions Today</span>
                <span className="value">{completedPomodoros}</span>
            </div>
            <div className="stat-item">
                <span className="label">Focus Strength</span>
                <span className="value">{(completedPomodoros * 25) / 60 > 0 ? ((completedPomodoros * 25) / 60).toFixed(1) : '0'} hrs</span>
            </div>
            <div className="stat-item">
                <span className="label">Streak</span>
                <span className="value">{streak} Days</span>
            </div>
        </div>
      </main>

      {/* Editor/Selector modal */}
      <AnimatePresence>
        {editorOpen && (
          <div className="editor-overlay">
            <motion.div 
                className="editor-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
            >
                <div className="editor-header">
                    <h2>{selectorMode ? 'New Template' : 'Edit Source'}</h2>
                    
                    {/* TOGGLE SWITCH */}
                    <div className="mode-toggle-group">
                        <button 
                            className={selectorMode ? 'active' : ''} 
                            onClick={() => setSelectorMode(true)}
                        >
                            Visual
                        </button>
                        <button 
                            className={!selectorMode ? 'active' : ''} 
                            onClick={() => setSelectorMode(false)}
                        >
                            Code
                        </button>
                    </div>
                </div>
                
                <div className="editor-body">
                    {selectorMode ? (
                        /* Selector Mode UI */
                        <div className="selector-mode">
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
                                
                                <div className="input-row" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'12px'}}>
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
                                
                                <div className="input-row" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginTop:'12px'}}>
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
                        /* Code Mode UI */
                        <div style={{ display: "flex", gap: 12, height: '100%' }}>
                            <div className="line-numbers-scrollable" ref={editorScrollRef} style={{ width: 40, textAlign:'right', opacity: 0.5, paddingTop: 10, fontFamily: 'monospace' }}>
                                {editorLines.map((_, i) => <div key={i}>{i+1}</div>)}
                            </div>
                            <textarea
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                onScroll={(e) => {
                                    if(editorScrollRef.current) editorScrollRef.current.scrollTop = e.target.scrollTop;
                                }}
                                style={{
                                    flex: 1,
                                    background: 'var(--bg-1)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    color: 'var(--color-text)',
                                    fontFamily: 'monospace',
                                    lineHeight: 1.6,
                                    resize: 'none',
                                    height: '300px'
                                }}
                            />
                        </div>
                    )}
                </div>

                <div className="editor-footer">
                    <button className="btn-ghost" onClick={() => setEditorOpen(false)}>Cancel</button>
                    <button className="btn-primary" onClick={selectorMode ? saveSelectorTemplate : saveEditor}>
                        Save Changes
                    </button>
                </div>
            </motion.div>
          </div>
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
