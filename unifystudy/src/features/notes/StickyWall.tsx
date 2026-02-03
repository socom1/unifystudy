// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { motion, useDragControls } from "framer-motion";
import { db, auth } from "@/services/firebaseConfig";
import { ref, onValue, push, set, remove, update } from "firebase/database";
import { Palette, X } from "lucide-react";
import "./StickyWall.scss";

const colors = ["#2d3436", "#0984e3", "#6c5ce7", "#00b894", "#d63031", "#e17055"];

export default function StickyWall() {
  const [notes, setNotes] = useState([]);
  const [userId, setUserId] = useState(null);
  const containerRef = useRef(null);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUserId(user.uid);
      else setUserId(null);
    });
    return unsubscribe;
  }, []);

  // Notes Listener
  useEffect(() => {
    if (!userId) return;
    const notesRef = ref(db, `users/${userId}/sticky_notes`);
    const unsubscribe = onValue(notesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setNotes(Object.entries(data).map(([id, val]) => ({ id, ...val })));
      } else {
        setNotes([]);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const addNote = () => {
    if (!userId) return;
    const notesRef = ref(db, `users/${userId}/sticky_notes`);
    const newNoteRef = push(notesRef);
    set(newNoteRef, {
      text: "",
      color: colors[Math.floor(Math.random() * colors.length)],
      x: 50 + Math.random() * 100, // Safe defaults
      y: 50 + Math.random() * 100,
      width: 240,
      height: 240,
      rotation: Math.random() * 4 - 2, 
    });
  };

  const updateNote = (id, updates) => {
    if (!userId) return;
    update(ref(db, `users/${userId}/sticky_notes/${id}`), updates);
  };

  const deleteNote = (id) => {
    if (!userId) return;
    remove(ref(db, `users/${userId}/sticky_notes/${id}`));
  };

  return (
    <div className="sticky-wall">
        {/* Floating Toolbar */}
      <div className="floating-toolbar">
         <div className="toolbar-actions">
            <button onClick={addNote}>+ New Note</button>
         </div>
      </div>

      <div 
        className="wall-area" 
        ref={containerRef}
        onDoubleClick={(e) => {
            if (e.target === containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const x = e.clientX - rect.left - 100;
                const y = e.clientY - rect.top - 100;
                
                if (!userId) return;
                const notesRef = ref(db, `users/${userId}/sticky_notes`);
                const newNoteRef = push(notesRef);
                set(newNoteRef, {
                  text: "",
                  color: colors[Math.floor(Math.random() * colors.length)],
                  x: Math.max(0, x),
                  y: Math.max(0, y),
                  width: 240,
                  height: 240,
                  rotation: Math.random() * 4 - 2, 
                });
            }
        }}
      >
        {notes.map((note) => (
          <StickyNote
            key={note.id}
            note={note}
            containerRef={containerRef}
            onUpdate={updateNote}
            onDelete={deleteNote}
          />
        ))}
         {notes.length === 0 && (
          <div className="empty-state">
            <p>Double-click anywhere to add a sticky note!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StickyNote({ note, containerRef, onUpdate, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const dragControls = useDragControls();

    // Local size state for immediate resizing feedback
    const [size, setSize] = useState({ 
        width: note.width || 240, 
        height: note.height || 240 
    });

    useEffect(() => {
        setSize({ width: note.width || 240, height: note.height || 240 });
    }, [note.width, note.height]);

    const renderText = (text) => {
        if (!text) return <span className="empty-note-hint">Double click to edit...</span>;
        
        // Simple link parsing
        const parts = text.split(/(\[\[.*?\]\])/g);
        return parts.map((part, index) => {
          if (part.startsWith('[[') && part.endsWith(']]')) {
            return (
              <span key={index} className="wiki-link">
                {part.slice(2, -2)}
              </span>
            );
          }
          return part;
        });
    };

    return (
        <motion.div
            className="sticky-note"
            drag
            dragListener={false} // Use header handle
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0}
            // Key fix: Use simple initial/animate for position
            // Mechanical feel: Instant updates, no smoothing
            transition={{ duration: 0 }}
            initial={false}
            animate={{ 
                x: note.x || 0,
                y: note.y || 0,
                rotate: note.rotation || 0,
                zIndex: isEditing ? 50 : 10,
            }}
            style={{
                width: size.width,
                height: size.height,
                backgroundColor: note.color || colors[0],
                position: 'absolute',
                top: 0,
                left: 0,
            }}
            onDragEnd={(e, info) => {
                const parentRect = containerRef.current?.getBoundingClientRect();
                if (!parentRect) return;

                const newX = (note.x || 0) + info.offset.x;
                const newY = (note.y || 0) + info.offset.y;

                // Clamp
                const clampedX = Math.max(0, Math.min(newX, parentRect.width - size.width));
                const clampedY = Math.max(0, Math.min(newY, parentRect.height - size.height));

                onUpdate(note.id, { x: clampedX, y: clampedY });
            }}
            onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
            }}
            onClick={() => setShowColorPicker(false)}
        >
             {/* Drag Handle */}
            <div
                className="note-header"
                onPointerDown={(e) => dragControls.start(e)}
                style={{ 
                    height: '32px', 
                    width: '100%', 
                    cursor: 'grab', 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    zIndex: 2,
                    borderBottom: '1px solid rgba(255,255,255,0.1)' 
                }}
            />

            {/* Actions */}
            <div className="note-actions">
                <button onClick={(e) => {
                    e.stopPropagation();
                    setShowColorPicker(!showColorPicker);
                }}>
                    <Palette size={14} />
                </button>
                <button onClick={(e) => {
                    e.stopPropagation();
                    onDelete(note.id);
                }}>
                    <X size={14} />
                </button>
            </div>

            {/* Color Picker */}
            {showColorPicker && (
                <div 
                    className="color-palette"
                    style={{
                        position: 'absolute',
                        top: '40px',
                        right: '5px',
                        padding: '8px',
                        background: 'rgba(0,0,0,0.85)',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '6px',
                        zIndex: 100,
                        backdropFilter: 'blur(4px)'
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    {colors.map(c => (
                        <div 
                            key={c}
                            onClick={(e) => {
                                e.stopPropagation();
                                onUpdate(note.id, { color: c });
                                setShowColorPicker(false);
                            }}
                            style={{
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                background: c,
                                cursor: 'pointer',
                                border: note.color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.3)',
                                transform: note.color === c ? 'scale(1.1)' : 'scale(1)'
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="note-content" style={{ marginTop: '30px', height: 'calc(100% - 30px)', overflow: 'hidden' }}>
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={note.text}
                        placeholder="Write something..."
                        onChange={(e) => onUpdate(note.id, { text: e.target.value })}
                        onBlur={() => setIsEditing(false)}
                        onPointerDown={(e) => e.stopPropagation()} // Allow text selection
                        className="note-textarea"
                        style={{
                            background: 'transparent',
                            color: 'inherit',
                            width: '100%',
                            height: '100%',
                            resize: 'none',
                            border: 'none',
                            outline: 'none',
                            fontSize: 'inherit',
                            fontFamily: 'inherit',
                        }}
                    />
                ) : (
                    <div className="note-view" style={{ width: '100%', height: '100%', overflowY: 'auto', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {renderText(note.text)}
                    </div>
                )}
            </div>

            {/* Resize Handle */}
            <div
                className="resize-handle"
                onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startW = size.width;
                    const startH = size.height;

                    const onMove = (moveEvent) => {
                        const newW = Math.max(200, startW + (moveEvent.clientX - startX));
                        const newH = Math.max(200, startH + (moveEvent.clientY - startY));
                        setSize({ width: newW, height: newH });
                    };

                    const onUp = (upEvent) => {
                        // Sync final size
                        const newW = Math.max(200, startW + (upEvent.clientX - startX));
                        const newH = Math.max(200, startH + (upEvent.clientY - startY));
                        onUpdate(note.id, { width: newW, height: newH });
                        
                        document.removeEventListener("pointermove", onMove);
                        document.removeEventListener("pointerup", onUp);
                    };

                    document.addEventListener("pointermove", onMove);
                    document.addEventListener("pointerup", onUp);
                }}
            />
        </motion.div>
    );
}
