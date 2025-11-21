// /mnt/data/tdlF.jsx
// Terminal-styled ToDo list with polished drag preview, framer animations, folder color picker,
// mobile full-screen editors, desktop right panel editor, undo, and reliable Firebase persistence.
//
// Requires: framer-motion installed, ../firebase exports { db, auth } (Realtime Database).
import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { ref, push, set, remove, onValue, update } from "firebase/database";
import "./tdlF.scss";

export default function TdlF() {
  // auth
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  // responsive
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : true
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // data
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [tasks, setTasks] = useState([]);

  // UI state
  const [folderInput, setFolderInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showFolderDetailMobile, setShowFolderDetailMobile] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);

  // drag state
  const dragState = useRef({ draggingIndex: null });
  const ghostEl = useRef(null);

  // throttled order persistence
  const orderTimeout = useRef(null);
  const persistQueue = useRef(null);

  // firebase listeners: folders
  useEffect(() => {
    if (!userId) {
      setFolders([]);
      return;
    }
    const foldersRef = ref(db, `users/${userId}/folders`);
    const unsub = onValue(foldersRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      arr.sort((a, b) => {
        if (a.order != null && b.order != null) return a.order - b.order;
        return (a.text || "").localeCompare(b.text || "");
      });
      setFolders(arr);
      if (currentFolderId && !arr.find((f) => f.id === currentFolderId)) {
        setCurrentFolderId(null);
      }
    });
    return () => unsub();
  }, [userId, currentFolderId]);

  // firebase listeners: tasks for current folder
  useEffect(() => {
    if (!userId || !currentFolderId) {
      setTasks([]);
      return;
    }
    const path = `users/${userId}/folders/${currentFolderId}/tasks`;
    const tasksRef = ref(db, path);
    const unsub = onValue(tasksRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      arr.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      setTasks(arr);
    });
    return () => unsub();
  }, [userId, currentFolderId]);

  // helpers
  const escapeHtml = (s) =>
    String(s || "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );

  // safe push wrapper
  const safePushTask = useCallback(
    async (folderId, taskObj) => {
      if (!userId || !folderId) return null;
      const tasksRef = ref(db, `users/${userId}/folders/${folderId}/tasks`);
      const newRef = push(tasksRef);
      await set(newRef, taskObj);
      return newRef.key;
    },
    [userId]
  );

  // persist order (throttled)
  const persistTaskOrder = useCallback(
    (folderId, orderedIds) => {
      if (!userId || !folderId) return;
      // batch updates
      const updates = {};
      orderedIds.forEach((id, idx) => {
        updates[`users/${userId}/folders/${folderId}/tasks/${id}/order`] = idx;
      });
      // debounce single database write
      if (orderTimeout.current) clearTimeout(orderTimeout.current);
      orderTimeout.current = setTimeout(() => {
        update(ref(db, "/"), updates).catch((e) => console.error(e));
        orderTimeout.current = null;
      }, 180);
    },
    [userId]
  );

  // folder operations
  const addFolder = async (e) => {
    e?.preventDefault();
    if (!userId || !folderInput.trim()) return;
    const folderObj = {
      text: folderInput.trim(),
      emoji: "📁",
      color: "#3b6ea5",
      notes: "",
      order: Date.now(),
    };
    const foldersRef = ref(db, `users/${userId}/folders`);
    const newRef = push(foldersRef);
    await set(newRef, folderObj);
    setFolderInput("");
  };

  const deleteFolder = async (folderId, e) => {
    e?.stopPropagation();
    if (!userId) return;
    const folderObj = folders.find((f) => f.id === folderId);
    setRecentlyDeleted({ type: "folder", id: folderId, data: folderObj });
    await remove(ref(db, `users/${userId}/folders/${folderId}`));
    if (currentFolderId === folderId) {
      setCurrentFolderId(null);
      setSelectedTaskId(null);
    }
  };

  const setFolderColor = async (folderId, color) => {
    if (!userId) return;
    await update(ref(db, `users/${userId}/folders/${folderId}`), { color });
  };

  const setFolderNotes = async (folderId, notes) => {
    if (!userId) return;
    await update(ref(db, `users/${userId}/folders/${folderId}`), { notes });
  };

  // tasks operations
  const addTask = async (e) => {
    e?.preventDefault();
    if (!userId || !currentFolderId || !taskInput.trim()) return;
    const taskObj = {
      text: taskInput.trim(),
      isActive: false,
      order: tasks.length,
      description: "",
      color:
        (folders.find((f) => f.id === currentFolderId) || {}).color ||
        "#3b6ea5",
    };
    await safePushTask(currentFolderId, taskObj);
    setTaskInput("");
  };

  const updateTask = async (taskId, payload) => {
    if (!userId || !currentFolderId) return;
    // always run update (no pushes!)
    await update(
      ref(db, `users/${userId}/folders/${currentFolderId}/tasks/${taskId}`),
      payload
    );
  };

  const toggleTask = async (taskId, currentState) => {
    if (!userId || !currentFolderId) return;
    // local optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isActive: !currentState } : t))
    );
    await update(
      ref(db, `users/${userId}/folders/${currentFolderId}/tasks/${taskId}`),
      { isActive: !currentState }
    );
  };

  const deleteTask = async (taskId, e) => {
    e?.stopPropagation();
    if (!userId || !currentFolderId) return;
    const removed = tasks.find((t) => t.id === taskId);
    setRecentlyDeleted({
      type: "task",
      folderId: currentFolderId,
      id: taskId,
      data: removed,
    });
    // optimistic local remove
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    await remove(
      ref(db, `users/${userId}/folders/${currentFolderId}/tasks/${taskId}`)
    );
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const undoDelete = async () => {
    if (!userId || !recentlyDeleted) return;
    if (recentlyDeleted.type === "task") {
      // push back into folder (will get new key)
      await safePushTask(recentlyDeleted.folderId, recentlyDeleted.data);
    } else if (recentlyDeleted.type === "folder") {
      const foldersRef = ref(db, `users/${userId}/folders`);
      const newRef = push(foldersRef);
      await set(newRef, recentlyDeleted.data);
    }
    setRecentlyDeleted(null);
  };

  // drag behavior: improved ghost
  const createGhost = (title, color) => {
    if (ghostEl.current) ghostEl.current.remove();
    const g = document.createElement("div");
    g.id = "tdl-drag-ghost";
    g.style.padding = "8px 12px";
    g.style.borderRadius = "10px";
    g.style.background = "rgba(10,14,18,0.95)";
    g.style.color = "#eaf6ff";
    g.style.boxShadow = "0 12px 40px rgba(0,0,0,0.6)";
    g.style.fontWeight = "700";
    g.style.display = "inline-flex";
    g.style.alignItems = "center";
    g.style.gap = "10px";
    g.style.backdropFilter = "blur(6px)";
    g.style.border = `1px solid ${color}22`;
    const chip = document.createElement("span");
    chip.style.width = "12px";
    chip.style.height = "12px";
    chip.style.background = color;
    chip.style.borderRadius = "3px";
    chip.style.display = "inline-block";
    const text = document.createElement("span");
    text.style.fontFamily = "Fira Code, monospace";
    text.style.fontSize = "13px";
    text.textContent = title;
    g.appendChild(chip);
    g.appendChild(text);
    document.body.appendChild(g);
    ghostEl.current = g;
  };

  const onDragStart = (e, draggedIndex) => {
    dragState.current.draggingIndex = draggedIndex;
    const folderColor =
      (folders.find((f) => f.id === currentFolderId) || {}).color || "#3b6ea5";
    const title = escapeHtml(tasks[draggedIndex]?.text || "Task");
    createGhost(title, folderColor);
    try {
      e.dataTransfer.setDragImage(ghostEl.current, 20, 16);
    } catch (_) {}
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = async (e, dropIndex) => {
    e.preventDefault();
    const from = dragState.current.draggingIndex;
    if (from == null) return;
    if (from === dropIndex) {
      dragState.current.draggingIndex = null;
      if (ghostEl.current) {
        ghostEl.current.remove();
        ghostEl.current = null;
      }
      return;
    }
    const arr = [...tasks];
    const [moved] = arr.splice(from, 1);
    arr.splice(dropIndex, 0, moved);
    setTasks(arr);
    const orderedIds = arr.map((t) => t.id);
    persistTaskOrder(currentFolderId, orderedIds);
    dragState.current.draggingIndex = null;
    if (ghostEl.current) {
      ghostEl.current.remove();
      ghostEl.current = null;
    }
  };

  // cleanup ghost
  useEffect(() => {
    const handler = () => {
      if (ghostEl.current) {
        ghostEl.current.remove();
        ghostEl.current = null;
      }
      dragState.current.draggingIndex = null;
    };
    window.addEventListener("dragend", handler);
    window.addEventListener("blur", handler);
    return () => {
      window.removeEventListener("dragend", handler);
      window.removeEventListener("blur", handler);
    };
  }, []);

  // UI helpers
  const currentFolder = folders.find((f) => f.id === currentFolderId) || null;
  const visibleTasks = tasks.filter((t) =>
    (t.text || "").toLowerCase().includes(searchQuery.toLowerCase())
  );
  const total = tasks.length;
  const completed = tasks.filter((t) => t.isActive).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  // motion variants
  const panelVariants = {
    hidden: { opacity: 0, x: 24 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
  };
  const fullScreenVariants = {
    hidden: { opacity: 0, y: 30 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 30 },
  };
  const listItem = {
    hidden: { opacity: 0, y: 8 },
    enter: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  };

  // keyboard shortcuts (space toggles selected task)
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Space" && selectedTaskId) {
        e.preventDefault();
        const t = tasks.find((x) => x.id === selectedTaskId);
        if (t) toggleTask(t.id, t.isActive);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedTaskId, tasks]);

  // ------- Detail components -------
  function TaskDetail({ taskId, onClose }) {
    const task = tasks.find((t) => t.id === taskId);
    const [title, setTitle] = useState(task?.text || "");
    const [desc, setDesc] = useState(task?.description || "");
    const [color, setColor] = useState(
      task?.color || currentFolder?.color || "#3b6ea5"
    );
    const [isActiveState, setIsActiveState] = useState(Boolean(task?.isActive));

    useEffect(() => {
      setTitle(task?.text || "");
      setDesc(task?.description || "");
      setColor(task?.color || currentFolder?.color || "#3b6ea5");
      setIsActiveState(Boolean(task?.isActive));
    }, [taskId, task, currentFolder?.id]);

    const save = async () => {
      await updateTask(taskId, {
        text: title,
        description: desc,
        color,
        isActive: isActiveState,
      });
      if (onClose) onClose();
    };

    const toggle = async () => {
      setIsActiveState((p) => !p);
      await updateTask(taskId, { isActive: !isActiveState });
    };

    if (!task) return null;
    return (
      <motion.div
        className="detailWrap"
        initial="hidden"
        animate="enter"
        exit="exit"
        variants={isMobile ? fullScreenVariants : panelVariants}
      >
        <div className="detailHeader">
          <h3>Task</h3>
          <div className="detailBtns">
            <button className="primaryBtn" onClick={save}>
              Save
            </button>
            <button className="ghostBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="detailBody">
          <label>Title</label>
          <input
            className="t"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <br />
          <label>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />

          <label>Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />

          <label className="checkboxRow">
            <input type="checkbox" checked={isActiveState} onChange={toggle} />{" "}
            Completed
          </label>
        </div>
      </motion.div>
    );
  }

  function FolderDetail({ folder }) {
    const [notes, setNotes] = useState(folder?.notes || "");
    const [color, setColor] = useState(folder?.color || "#3b6ea5");
    useEffect(() => {
      setNotes(folder?.notes || "");
      setColor(folder?.color || "#3b6ea5");
    }, [folder?.id]);

    const saveNotes = async () => {
      await setFolderNotes(folder.id, notes);
    };
    const saveColor = async (c) => {
      setColor(c);
      await setFolderColor(folder.id, c);
    };

    if (!folder) return null;
    return (
      <motion.div
        className="folderDetailWrap"
        initial="hidden"
        animate="enter"
        exit="exit"
        variants={isMobile ? fullScreenVariants : panelVariants}
      >
        <div className="detailHeader">
          <h3>Folder</h3>
          <div className="detailBtns">
            <button className="primaryBtn" onClick={saveNotes}>
              Save
            </button>
            <button
              className="ghostBtn"
              onClick={() => {
                if (isMobile) setShowFolderDetailMobile(false);
              }}
            >
              Close
            </button>
          </div>
        </div>

        <div className="detailBody">
          <label>Name</label>
          <div className="folderNameInline">
            <div
              className="folderIconPreview"
              style={{ background: folder.color || "#3b6ea5" }}
            >
              {folder.emoji || "📁"}
            </div>
            <div className="folderNameText">{folder.text}</div>
          </div>

          <label>Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            onBlur={() => saveColor(color)}
          />

          <label>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </div>
      </motion.div>
    );
  }

  // Render
  return (
    <div className="tdl-root">
      <div className="topRow">
        <input
          className="searchInput"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="layoutFinder">
        <aside className="finderSidebar">
          <div className="finderHeader">
            <div className="hdrLeft">
              <strong>Explorer</strong>
            </div>
            <div className="hdrRight">
              <form
                onSubmit={addFolder}
                className="folderAdd"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  value={folderInput}
                  onChange={(e) => setFolderInput(e.target.value)}
                  placeholder="New folder"
                />
                <button type="submit">+</button>
              </form>
            </div>
          </div>

          <ul className="folderTree">
            {folders.map((f) => (
              <motion.li
                layout
                key={f.id}
                className={`folderNode ${
                  currentFolderId === f.id ? "open" : ""
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="folderRow"
                  onClick={() => {
                    setCurrentFolderId((prev) => (prev === f.id ? null : f.id));
                  }}
                >
                  <button
                    className={`caret ${
                      currentFolderId === f.id ? "down" : "right"
                    }`}
                    aria-hidden
                  >
                    <span />
                  </button>
                  <div
                    className="folderIcon"
                    style={{ background: f.color || "#3b6ea5" }}
                  >
                    {f.emoji || "📁"}
                  </div>
                  <div className="folderName">{f.text}</div>

                  {isMobile ? (
                    <div className="folderActions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowFolderDetailMobile(true);
                          setCurrentFolderId(f.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(f.id, e);
                        }}
                      >
                        Del
                      </button>
                    </div>
                  ) : (
                    <div className="folderActions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(f.id, e);
                        }}
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>

                {currentFolderId === f.id && (
                  <ul className="folderChildren">
                    <li className="meta">
                      • {f.tasks ? Object.keys(f.tasks).length : 0} items
                    </li>
                    {f.notes && (
                      <li className="meta">
                        • notes: {String(f.notes).slice(0, 48)}
                        {String(f.notes).length > 48 ? "…" : ""}
                      </li>
                    )}
                  </ul>
                )}
              </motion.li>
            ))}
          </ul>
        </aside>

        <main className="mainContent">
          {!currentFolderId ? (
            <div className="placeholder">
              <h3>Your folders</h3>
              <p>Open a folder to view tasks.</p>
            </div>
          ) : (
            <div className="taskPane">
              <div className="paneHeader">
                <h3>{currentFolder?.text}</h3>
                <div className="progressMini">{progress}%</div>
              </div>

              <form
                onSubmit={addTask}
                className="taskAdd"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  placeholder="New task"
                />
                <button type="submit">Add</button>
              </form>

              <ul className="taskList">
                <AnimatePresence>
                  {visibleTasks.map((t) => {
                    const realIndex = tasks.findIndex((x) => x.id === t.id);
                    return (
                      <motion.li
                        key={t.id}
                        layout
                        initial="hidden"
                        animate="enter"
                        exit="exit"
                        variants={listItem}
                        className="taskRow"
                        draggable
                        onDragStart={(e) => onDragStart(e, realIndex)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, realIndex)}
                      >
                        <div
                          className="taskLeft"
                          onDoubleClick={() => setSelectedTaskId(t.id)}
                        >
                          <button
                            className={`tick ${t.isActive ? "done" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(t.id, t.isActive);
                            }}
                          />
                          <span
                            className={`taskText ${
                              t.isActive ? "finished" : ""
                            }`}
                          >
                            {t.text}
                          </span>
                        </div>

                        <div className="taskRight">
                          <button
                            className="opt"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(t.id);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="opt"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTask(t.id, e);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </div>
          )}
        </main>

        <aside className="rightInfo">
          <div className="rightPanelInner">
            <AnimatePresence mode="wait">
              {selectedTaskId ? (
                <TaskDetail
                  key={`task-${selectedTaskId}`}
                  taskId={selectedTaskId}
                  onClose={() => setSelectedTaskId(null)}
                />
              ) : currentFolder ? (
                <FolderDetail
                  key={`folder-${currentFolder.id}`}
                  folder={currentFolder}
                />
              ) : (
                <motion.div
                  key="empty"
                  initial="hidden"
                  animate="enter"
                  exit="exit"
                  variants={panelVariants}
                  className="muted"
                >
                  Select a folder or task
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>

      {/* Mobile overlays */}
      <AnimatePresence>
        {isMobile && selectedTaskId && (
          <motion.div
            className="mobileOverlay"
            initial="hidden"
            animate="enter"
            exit="exit"
            variants={fullScreenVariants}
          >
            <TaskDetail
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobile && showFolderDetailMobile && currentFolder && (
          <motion.div
            className="mobileOverlay"
            initial="hidden"
            animate="enter"
            exit="exit"
            variants={fullScreenVariants}
          >
            <FolderDetail folder={currentFolder} />
            <div
              style={{ padding: 12, display: "flex", justifyContent: "center" }}
            >
              <button
                className="ghostBtn"
                onClick={() => setShowFolderDetailMobile(false)}
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo bar */}
      {recentlyDeleted && (
        <div className="undoBar">
          <span>
            {recentlyDeleted.type === "task"
              ? "Task deleted"
              : "Folder deleted"}
          </span>
          <div className="undoActions">
            <button onClick={undoDelete}>Undo</button>
            <button onClick={() => setRecentlyDeleted(null)}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}
