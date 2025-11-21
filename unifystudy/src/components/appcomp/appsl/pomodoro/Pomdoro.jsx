import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./pomodoro.scss";
// import "./pomodoro_terminal.scss"; // optional alternate stylesheet

// Helper: format mm:ss (display uses ceil so you don't see '00' flicker)
const fmt = (s) => {
  const secs = Math.max(0, Math.ceil(s));
  const mm = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(secs % 60)
    .toString()
    .padStart(2, "0");
  return `${mm}:${ss}`;
};

// Default templates if none provided
const defaultTemplates = [
  {
    id: "t1",
    name: "Default Pomodoro",
    work: 25,
    short: 5,
    long: 15,
    cycles: 4,
  },
  { id: "t2", name: "Deep Work", work: 50, short: 10, long: 30, cycles: 3 },
];

export default function Pomodoro({
  templates = defaultTemplates,
  onApplyTemplate,
}) {
  // templates
  const [templateList, setTemplateList] = useState(templates);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    templateList[0]?.id || null
  );
  const selectedTemplate =
    templateList.find((t) => t.id === selectedTemplateId) || templateList[0];

  // timer / mode state
  const [mode, setMode] = useState("work"); // "work" | "short" | "long"
  const [running, setRunning] = useState(false);
  // secondsLeft is a float (seconds). Initialize on selected template.
  const [secondsLeft, setSecondsLeft] = useState(
    (selectedTemplate?.work || 25) * 60
  );

  // mutable refs for rAF engine
  const rafRef = useRef(null);
  const endTimeRef = useRef(null); // absolute timestamp (ms) when current session ends
  const lastNowRef = useRef(null); // last animation frame time
  const secondsLeftRef = useRef(secondsLeft); // mirror of secondsLeft for stable closures

  // sessions tracking
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  // editor UI
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

  // Derived total seconds for current mode
  const totalSeconds = useMemo(() => {
    if (mode === "work") return (selectedTemplate?.work || 25) * 60;
    if (mode === "short") return (selectedTemplate?.short || 5) * 60;
    return (selectedTemplate?.long || 15) * 60;
  }, [mode, selectedTemplate]);

  // keep secondsLeftRef in sync with state
  useEffect(() => {
    secondsLeftRef.current = secondsLeft;
  }, [secondsLeft]);

  // When totalSeconds changes (mode/template change), reset secondsLeft to that total (do not auto-start)
  useEffect(() => {
    cancelRaf();
    setRunning(false);
    setSecondsLeft(totalSeconds);
    secondsLeftRef.current = totalSeconds;
    endTimeRef.current = null;
    lastNowRef.current = null;
  }, [totalSeconds]);

  // On template selection change, switch to work mode and reset
  useEffect(() => {
    setMode("work");
    setRunning(false);
    setSecondsLeft((selectedTemplate?.work || 25) * 60);
  }, [selectedTemplateId]);

  // circumference constant (r = 100 matches CSS/SVG)
  const CIRC = 2 * Math.PI * 100;

  // progress percent (smooth because secondsLeft is float)
  const progressPercent = Math.max(
    0,
    Math.min(100, ((totalSeconds - secondsLeft) / totalSeconds) * 100)
  );

  // rAF engine functions
  function cancelRaf() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  // core rAF loop: updates secondsLeft based on endTimeRef
  const rafLoop = (now) => {
    if (!endTimeRef.current) {
      // safety - shouldn't happen
      cancelRaf();
      setRunning(false);
      return;
    }

    // compute remaining ms
    const remainingMs = endTimeRef.current - now;
    const remainingSec = Math.max(0, remainingMs / 1000);
    // update state and ref
    secondsLeftRef.current = remainingSec;
    setSecondsLeft(remainingSec);

    if (remainingMs <= 0) {
      // finished
      cancelRaf();
      rafRef.current = null;
      setRunning(false);
      // ensure secondsLeft is exactly 0
      secondsLeftRef.current = 0;
      setSecondsLeft(0);
      handleComplete(); // advance mode / breaks
      return;
    }

    // schedule next frame
    rafRef.current = requestAnimationFrame(rafLoop);
  };

  // start rAF timer: set endTimeRef using current performance.now()
  const startRaf = () => {
    // compute endTime from now + secondsLeft
    const now = performance.now();
    endTimeRef.current = now + Math.max(0, secondsLeftRef.current) * 1000;
    // start loop
    cancelRaf();
    rafRef.current = requestAnimationFrame(rafLoop);
  };

  // start / pause control
  const startPause = () => {
    if (running) {
      // pause: cancel rAF but keep secondsLeftRef updated (it already is)
      cancelRaf();
      setRunning(false);
      endTimeRef.current = null;
    } else {
      // start: set endTime and begin rAF
      startRaf();
      setRunning(true);
    }
  };

  // reset to current mode's total
  const reset = () => {
    cancelRaf();
    setRunning(false);
    endTimeRef.current = null;
    setSecondsLeft(totalSeconds);
    secondsLeftRef.current = totalSeconds;
  };

  // advanced: ensure we cancel rAF on unmount
  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
    return () => {
      cancelRaf();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // completion handling (same logic as before)
  const handleComplete = () => {
    if (mode === "work") {
      setCompletedPomodoros((c) => c + 1);
      setCycleCount((c) => c + 1);
      const nextIsLong = cycleCount + 1 >= (selectedTemplate?.cycles || 4);
      if (nextIsLong) {
        setMode("long");
        setSecondsLeft((selectedTemplate?.long || 15) * 60);
        secondsLeftRef.current = (selectedTemplate?.long || 15) * 60;
        setCycleCount(0);
      } else {
        setMode("short");
        setSecondsLeft((selectedTemplate?.short || 5) * 60);
        secondsLeftRef.current = (selectedTemplate?.short || 5) * 60;
      }
    } else {
      setMode("work");
      setSecondsLeft((selectedTemplate?.work || 25) * 60);
      secondsLeftRef.current = (selectedTemplate?.work || 25) * 60;
    }
    // Notification
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("Pomodoro Timer", {
        body: mode === "work" ? "Time for a break!" : "Back to work!",
      });
    }
  };

  // Apply template (expose hook)
  const applyTemplate = (tpl) => {
    setSelectedTemplateId(tpl.id);
    if (onApplyTemplate) onApplyTemplate(tpl);
  };

  // Editor save: parse simple format and update templateList (keeps user templates)
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

              {/* Progress ring (uses CIRC and the smooth secondsLeft) */}
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
                style={{ transition: "none" }} // rAF updates, so no CSS transition required
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
              <div className="timer__time">{fmt(secondsLeft)}</div>
              <div className="timer__sub">{selectedTemplate?.name}</div>
            </div>
          </div>

          {/* controls */}
          <div className="timer__controls">
            <button className="primary" onClick={startPause}>
              {running ? "Pause" : "Start"}
            </button>
            <button onClick={reset}>Reset</button>
            <button
              onClick={() => {
                setMode("work");
                setSecondsLeft((selectedTemplate?.work || 25) * 60);
                secondsLeftRef.current = (selectedTemplate?.work || 25) * 60;
                setRunning(false);
                cancelRaf();
              }}
            >
              Jump to Work
            </button>
            <button
              onClick={() => {
                setMode("short");
                setSecondsLeft((selectedTemplate?.short || 5) * 60);
                secondsLeftRef.current = (selectedTemplate?.short || 5) * 60;
                setRunning(false);
                cancelRaf();
              }}
            >
              Short Break
            </button>
            <button
              onClick={() => {
                setMode("long");
                setSecondsLeft((selectedTemplate?.long || 15) * 60);
                secondsLeftRef.current = (selectedTemplate?.long || 15) * 60;
                setRunning(false);
                cancelRaf();
              }}
            >
              Long Break
            </button>
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
              onClick={() => {
                setMode("work");
                setSecondsLeft((selectedTemplate?.work || 25) * 60);
                secondsLeftRef.current = (selectedTemplate?.work || 25) * 60;
                setRunning(false);
                cancelRaf();
              }}
            >
              Work
            </button>
            <button
              className={`quick-bar__btn ${mode === "short" ? "active" : ""}`}
              onClick={() => {
                setMode("short");
                setSecondsLeft((selectedTemplate?.short || 5) * 60);
                secondsLeftRef.current = (selectedTemplate?.short || 5) * 60;
                setRunning(false);
                cancelRaf();
              }}
            >
              Short
            </button>
            <button
              className={`quick-bar__btn ${mode === "long" ? "active" : ""}`}
              onClick={() => {
                setMode("long");
                setSecondsLeft((selectedTemplate?.long || 15) * 60);
                secondsLeftRef.current = (selectedTemplate?.long || 15) * 60;
                setRunning(false);
                cancelRaf();
              }}
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
                  width: 80,
                  background: "var(--color-bg-dark)",
                  borderRadius: 6,
                  padding: 8,
                  color: "var(--color-muted)",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Line</div>
                <div
                  ref={editorScrollRef}
                  style={{ maxHeight: 380, overflowY: "auto" }}
                >
                  {editorLines.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "2px 0",
                        textAlign: "right",
                        opacity: 0.7,
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
