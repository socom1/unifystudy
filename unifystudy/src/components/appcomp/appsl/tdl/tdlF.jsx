// /mnt/data/tdlF.jsx
// Updated: visual polish + folder drag/drop reparenting + recursive delete + quick-tag add + tagFilter persistence
// Keep your firebase setup (db, auth). Uses Realtime DB paths:
// users/{uid}/folders/{folderId} and users/{uid}/folders/{folderId}/tasks/{taskId}

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { ref as databaseRef, push, set, remove, onValue, update } from "firebase/database";
import "./tdlF.scss";

/* --- small helpers --- */
const SAMPLE_TAG_COLORS = [
  "var(--color-secondary)",
  "var(--color-primary)",
  "var(--color-primary)",
  "var(--color-danger)",
  "#ffd27f",
];
const randomTagColor = () =>
  SAMPLE_TAG_COLORS[Math.floor(Math.random() * SAMPLE_TAG_COLORS.length)];
const L_TAG_FILTER = "tdl_tagFilter_v1";

/* FolderNode - recursive renderer w/ drag/drop support */
function FolderNode({
  folder,
  depth = 0,
  childrenMap,
  currentFolderId,
  setCurrentFolderId,
  addSubfolderUI,
  creatingUnder,
  setCreatingUnder,
  newFolderInput,
  setNewFolderInput,
  createFolderUnder,
  deleteFolder,
  setShowFolderDetailMobile,
  isMobile,
  onFolderDragStart,
  onFolderDragOver,
  onFolderDrop,
  dragOverFolderId,
}) {
  const children = childrenMap[folder.id] || [];
  const isOpen = currentFolderId === folder.id;

  return (
    <li
      className={`folderNode ${
        dragOverFolderId === folder.id ? "dropTarget" : ""
      }`}
      data-depth={depth}
      draggable
      onDragStart={(e) => onFolderDragStart(e, folder)}
      onDragOver={(e) => onFolderDragOver(e, folder)}
      onDrop={(e) => onFolderDrop(e, folder)}
    >
      <div
        className={`folderRow ${isOpen ? "open" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          setCurrentFolderId((p) => (p === folder.id ? null : folder.id));
        }}
        role="button"
        aria-expanded={isOpen}
      >
        <button
          className={`caret ${isOpen ? "down" : "right"}`}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentFolderId((p) => (p === folder.id ? null : folder.id));
          }}
          aria-hidden
        >
          <span />
        </button>

        <div
          className="folderIcon"
          style={{ background: folder.color || "var(--color-primary)" }}
        >
          {folder.emoji || "📁"}
        </div>

        <div className="folderName">{folder.text}</div>

        <div className="folderActions">
          <button
            title="Add subfolder"
            onClick={(e) => {
              e.stopPropagation();
              addSubfolderUI(folder.id);
            }}
          >
            +
          </button>

          {isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFolderDetailMobile(true);
                setCurrentFolderId(folder.id);
              }}
            >
              Edit
            </button>
          )}

          <button
            title="Delete folder"
            onClick={(e) => {
              e.stopPropagation();
              deleteFolder(folder.id, e);
            }}
          >
            Del
          </button>
        </div>
      </div>

      {creatingUnder === folder.id && (
        <div className="subfolderInline">
          <input
            value={newFolderInput}
            placeholder="New subfolder name..."
            onChange={(e) => setNewFolderInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                createFolderUnder(folder.id);
              } else if (e.key === "Escape") {
                setCreatingUnder(null);
                setNewFolderInput("");
              }
            }}
            autoFocus
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              createFolderUnder(folder.id);
            }}
          >
            Create
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCreatingUnder(null);
              setNewFolderInput("");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {children.length > 0 && (
        <ul className="folderChildren">
          {children.map((c) => (
            <FolderNode
              key={c.id}
              folder={c}
              depth={depth + 1}
              childrenMap={childrenMap}
              currentFolderId={currentFolderId}
              setCurrentFolderId={setCurrentFolderId}
              addSubfolderUI={addSubfolderUI}
              creatingUnder={creatingUnder}
              setCreatingUnder={setCreatingUnder}
              newFolderInput={newFolderInput}
              setNewFolderInput={setNewFolderInput}
              createFolderUnder={createFolderUnder}
              deleteFolder={deleteFolder}
              setShowFolderDetailMobile={setShowFolderDetailMobile}
              isMobile={isMobile}
              onFolderDragStart={onFolderDragStart}
              onFolderDragOver={onFolderDragOver}
              onFolderDrop={onFolderDrop}
              dragOverFolderId={dragOverFolderId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function TdlF() {
  /* --- Auth / responsive --- */
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUserId(u ? u.uid : null));
    return () => unsub();
  }, []);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 900 : true
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    const onResize = () => {
      const m = window.innerWidth < 900;
      setIsMobile(m);
      if (!m) setSidebarOpen(true);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --- data & selection --- */
  const [foldersFlat, setFoldersFlat] = useState([]);
  const [childrenMap, setChildrenMap] = useState({});
  const [rootFolders, setRootFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activeView, setActiveView] = useState("folder"); // 'folder', 'upcoming', 'today', 'calendar', 'sticky'

  /* --- UI states --- */
  const [newFolderInput, setNewFolderInput] = useState("");
  const [creatingUnder, setCreatingUnder] = useState(null);
  const [taskInput, setTaskInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showFolderDetailMobile, setShowFolderDetailMobile] = useState(false);
  const [recentlyDeleted, setRecentlyDeleted] = useState(null);
  const [tagFilter, setTagFilter] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null); // for folder drop highlight
  const [isAddingSubfolder, setIsAddingSubfolder] = useState(false); // for subfolder creation in main view
  const [expandedFolders, setExpandedFolders] = useState(new Set()); // track expanded folders in task view
  const [selectedFolderId, setSelectedFolderId] = useState(null); // track selected folder for detail view

  // Clear expanded folders when changing folders
  useEffect(() => {
    setExpandedFolders(new Set());
  }, [currentFolderId]);

  // persist tagFilter in localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem(L_TAG_FILTER);
      if (v) setTagFilter(v);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      if (tagFilter) localStorage.setItem(L_TAG_FILTER, tagFilter);
      else localStorage.removeItem(L_TAG_FILTER);
    } catch {}
  }, [tagFilter]);

  /* --- drag state (tasks ghost handled as before) --- */
  const dragState = useRef({ draggingIndex: null });
  const ghostEl = useRef(null);
  const orderTimeout = useRef(null);

  /* --- folders load & tree build --- */
  useEffect(() => {
    if (!userId) {
      setFoldersFlat([]);
      setChildrenMap({});
      setRootFolders([]);
      return;
    }
    const foldersRef = databaseRef(db, `users/${userId}/folders`);
    const unsub = onValue(foldersRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, val]) => ({
        id,
        parentId: val.parentId ?? null,
        text: val.text,
        color: val.color,
        emoji: val.emoji,
        notes: val.notes,
        order: val.order ?? 0,
        createdAt: val.createdAt ?? 0,
        tasks: val.tasks || {}, // Include tasks for global views
      }));
      arr.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        return (a.text || "").localeCompare(b.text || "");
      });
      const map = {};
      arr.forEach((f) => {
        const pid = f.parentId ?? "__root";
        if (!map[pid]) map[pid] = [];
        map[pid].push(f);
      });
      setFoldersFlat(arr);
      setChildrenMap(map);
      setRootFolders(map["__root"] || []);
      if (currentFolderId && !arr.find((f) => f.id === currentFolderId)) {
        // Don't reset if we are in a global view
        if (activeView === 'folder') setCurrentFolderId(null);
      }
    });
    return () => unsub();
  }, [userId, currentFolderId, activeView]);

  /* --- tasks load for folder --- */
  useEffect(() => {
    if (!userId || !currentFolderId || activeView !== 'folder') {
      if (activeView === 'folder') setTasks([]);
      return;
    }
    const tasksRef = databaseRef(
      db,
      `users/${userId}/folders/${currentFolderId}/tasks`
    );
    const unsub = onValue(tasksRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, val]) => ({
        id,
        tags: val.tags || [],
        ...val,
      }));
      arr.sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
      setTasks(arr);
    });
    return () => unsub();
  }, [userId, currentFolderId, activeView]);

  /* --- Notifications --- */
  // Only check if permission is ALREADY granted.
  // Requesting permission must be done via user gesture (e.g. button click).
  useEffect(() => {
    if (!("Notification" in window)) return;
    
    const checkDueTasks = () => {
        if (Notification.permission !== "granted") return;
        const now = new Date();
        const todayStr = now.toISOString().split("T")[0];
        
        // Check all tasks in all folders
        foldersFlat.forEach(folder => {
            if (!folder.tasks) return;
            Object.values(folder.tasks).forEach(task => {
                if (task.dueDate === todayStr && !task.isActive && !task.notified) {
                    new Notification(`Task Due Today: ${task.text}`, {
                        body: `In folder: ${folder.text}`,
                    });
                }
            });
        });
    };

    const interval = setInterval(checkDueTasks, 60000 * 60); // Check every hour
    checkDueTasks(); // Check on load
    return () => clearInterval(interval);
  }, [foldersFlat]);


  /* --- helpers for tasks --- */
  const requestNotificationPermission = () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications");
      return;
    }
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("Notifications enabled!");
      }
    });
  };

  const safePushTask = useCallback(
    async (folderId, taskObj) => {
      if (!userId || !folderId) return null;
      const tasksRef = databaseRef(db, `users/${userId}/folders/${folderId}/tasks`);
      const newRef = push(tasksRef);
      await set(newRef, taskObj);
      return newRef.key;
    },
    [userId]
  );

  const persistTaskOrder = useCallback(
    (folderId, orderedIds) => {
      if (!userId || !folderId) return;
      const updates = {};
      orderedIds.forEach((id, idx) => {
        updates[`users/${userId}/folders/${folderId}/tasks/${id}/order`] = idx;
      });
      if (orderTimeout.current) clearTimeout(orderTimeout.current);
      orderTimeout.current = setTimeout(
        () => update(databaseRef(db, "/"), updates).catch(console.error),
        200
      );
    },
    [userId]
  );

  /* --- folder ops --- */

  const createFolderUnder = async (parentId = null) => {
    if (!userId || !newFolderInput.trim()) return;
    const folderObj = {
      text: newFolderInput.trim(),
      emoji: "📁",
      color: "var(--color-primary)",
      notes: "",
      order: Date.now(),
      parentId: parentId ?? null,
      createdAt: Date.now(),
    };
    const foldersRef = databaseRef(db, `users/${userId}/folders`);
    const newRef = push(foldersRef);
    await set(newRef, folderObj);
    setNewFolderInput("");
    setCreatingUnder(null);
    // Set as current folder to show in details panel
    setCurrentFolderId(newRef.key);
  };

  const addSubfolderUI = (parentId) => {
    setCreatingUnder(parentId);
    setNewFolderInput("");
    setCurrentFolderId(parentId);
  };

  // recursive delete helper: collect all descendant folder ids (including self)
  const collectDescendants = (rootId, flat) => {
    const out = [];
    const map = {};
    flat.forEach((f) => {
      const pid = f.parentId ?? "__root";
      if (!map[pid]) map[pid] = [];
      map[pid].push(f);
    });
    const walk = (id) => {
      out.push(id);
      const ch = map[id] || [];
      ch.forEach((c) => walk(c.id));
    };
    walk(rootId);
    return out;
  };

  const deleteFolder = async (folderId, e) => {
    e?.stopPropagation();
    if (!userId) return;
    const folderObj = foldersFlat.find((f) => f.id === folderId);
    const confirmMsg = `Delete "${folderObj?.text}" and ALL subfolders and tasks? This cannot be undone except by "Undo" immediately.`;
    const ok = window.confirm(confirmMsg);
    if (!ok) return;

    // collect subtree
    const toDeleteFolders = collectDescendants(folderId, foldersFlat);

    // build updates: remove folders (tasks are automatically removed as children)
    const updates = {};
    toDeleteFolders.forEach((fid) => {
      updates[`users/${userId}/folders/${fid}`] = null;
    });

    // store recentlyDeleted for undo (shallow snapshot)
    setRecentlyDeleted({
      type: "folder-delete",
      ids: toDeleteFolders.slice(),
      data: folderObj,
      timestamp: Date.now(),
    });

    // perform update (bulk delete)
    await update(databaseRef(db, "/"), updates).catch(console.error);

    if (currentFolderId && toDeleteFolders.includes(currentFolderId)) {
      setCurrentFolderId(null);
      setSelectedTaskId(null);
    }
  };

  const setFolderColor = async (folderId, color) => {
    if (!userId) return;
    await update(databaseRef(db, `users/${userId}/folders/${folderId}`), { color });
  };

  const setFolderNotes = async (folderId, notes) => {
    if (!userId) return;
    await update(databaseRef(db, `users/${userId}/folders/${folderId}`), { notes });
  };

  /* --- tasks ops --- */
  const addTask = async (e) => {
    e?.preventDefault();
    if (!userId || !taskInput.trim()) return;
    
    // Determine target folder
    let targetFolderId = currentFolderId;
    if (activeView !== 'folder') {
        // If in global view, default to first folder or ask user? 
        // For now, default to the first root folder or create an 'Inbox' if needed.
        // Let's just pick the first folder found.
        targetFolderId = foldersFlat[0]?.id;
        if (!targetFolderId) {
            alert("Please create a list first.");
            return;
        }
    }

    const folderColor =
      foldersFlat.find((f) => f.id === targetFolderId)?.color || "var(--color-primary)";
    
    const taskObj = {
      text: taskInput.trim(),
      isActive: false,
      order: Date.now(), // Use timestamp for order in global views
      description: "",
      color: folderColor,
      tags: [],
      dueDate: activeView === 'today' ? new Date().toISOString().split('T')[0] : "",
    };
    await safePushTask(targetFolderId, taskObj);
    setTaskInput("");
  };

  const updateTask = async (taskId, payload) => {
    if (!userId) return;
    // Find folder for this task if we are in global view
    let fid = currentFolderId;
    if (!fid) {
        const found = foldersFlat.find(f => f.tasks && f.tasks[taskId]);
        if (found) fid = found.id;
    }
    if (!fid) return;

    await update(
      databaseRef(db, `users/${userId}/folders/${fid}/tasks/${taskId}`),
      payload
    );
  };

  const toggleTask = async (taskId, currentState, folderId = null) => {
    if (!userId) return;
    // Optimistic update for local state if in folder view
    if (activeView === 'folder') {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, isActive: !currentState } : t))
        );
    }
    
    // Find folder
    let fid = folderId || currentFolderId;
    if (!fid) {
        const found = foldersFlat.find(f => f.tasks && f.tasks[taskId]);
        if (found) fid = found.id;
    }
    if (!fid) return;

    await update(
      databaseRef(db, `users/${userId}/folders/${fid}/tasks/${taskId}`),
      { isActive: !currentState }
    );
  };

  const deleteTask = async (taskId, e) => {
    e?.stopPropagation();
    if (!userId) return;
    
    let fid = currentFolderId;
    let taskData = null;
    
    if (!fid) {
         const found = foldersFlat.find(f => f.tasks && f.tasks[taskId]);
         if (found) {
             fid = found.id;
             taskData = found.tasks[taskId];
         }
    } else {
        taskData = tasks.find(t => t.id === taskId);
    }

    if (!fid) return;

    setRecentlyDeleted({
      type: "task",
      folderId: fid,
      id: taskId,
      data: taskData,
      timestamp: Date.now(),
    });
    
    if (activeView === 'folder') {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
    
    await remove(
      databaseRef(db, `users/${userId}/folders/${fid}/tasks/${taskId}`)
    );
    if (selectedTaskId === taskId) setSelectedTaskId(null);
  };

  const undoDelete = async () => {
    if (!userId || !recentlyDeleted) return;
    const { type } = recentlyDeleted;
    if (type === "task") {
      const { folderId, data } = recentlyDeleted;
      await safePushTask(folderId, data);
    } else if (type === "folder-delete") {
      // Can't fully restore subtree reliably — show message
      alert(
        "Recursive folder delete can't be fully restored automatically. Consider exporting data or re-creating."
      );
    } else if (type === "folder-move") {
      // revert folder move
      const { id, previousParent } = recentlyDeleted;
      if (id)
        await update(databaseRef(db, `users/${userId}/folders/${id}`), {
          parentId: previousParent ?? null,
        });
    }
    setRecentlyDeleted(null);
  };

  /* --- tag helpers --- */
  const addTagToTask = async (taskId, label) => {
    // ... (implementation depends on finding task, simplified for now)
    // Reuse updateTask
    // For now, let's assume we can find the task object to get current tags
    // This is tricky in global view without passing the task object.
    // Let's skip quick tag add in global view for this iteration or fetch it first.
  };
  
  const quickAddTagFromRow = async (taskId) => {
     const input = window.prompt("Add tag (label):");
     if (!input) return;
     
     // Find task to get current tags
     let task = tasks.find(t => t.id === taskId);
     if (!task) {
         // global search
         for (const f of foldersFlat) {
             if (f.tasks && f.tasks[taskId]) {
                 task = {id: taskId, ...f.tasks[taskId]};
                 break;
             }
         }
     }
     if (!task) return;
     
     const newTag = { label: input.trim(), color: randomTagColor() };
     const newTags = [...(task.tags || []), newTag];
     await updateTask(taskId, { tags: newTags });
  };

  /* --- task drag helpers --- (same as before) */
  // ... (omitted for brevity, assuming unchanged or compatible)
  // Note: Drag and drop in global views is complex (reparenting). 
  // For now, disable D&D in global views or restrict it.
  
  const onDragStart = (e, idx) => {
    if (activeView !== 'folder') return; // Disable D&D in global views for now
    dragState.current.draggingIndex = idx;
    const folderColor =
      foldersFlat.find((f) => f.id === currentFolderId)?.color || "var(--color-primary)";
    const title = (tasks[idx]?.text || "Task").replace(/</g, "&lt;");
    createGhost(title, folderColor);
    try {
      e.dataTransfer.setDragImage(ghostEl.current, 20, 16);
    } catch {}
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDrop = (e, dropIndex) => {
    e.preventDefault();
    if (activeView !== 'folder') return;
    const dragIndex = dragState.current.draggingIndex;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const newTasks = [...tasks];
    const [moved] = newTasks.splice(dragIndex, 1);
    newTasks.splice(dropIndex, 0, moved);
    
    setTasks(newTasks); // Optimistic update
    
    // Persist order
    const orderedIds = newTasks.map(t => t.id);
    persistTaskOrder(currentFolderId, orderedIds);
    
    dragState.current.draggingIndex = null;
  };
  // ... onDragOver, onDrop (keep existing logic for folder view)

  /* --- filters & visible tasks --- */
  
  // Memoize visibleTasks to prevent animation resets on input change
  const visibleTasks = React.useMemo(() => {
    let sourceTasks = [];
    
    if (activeView === 'folder') {
        sourceTasks = tasks;
    } else {
        // Gather all tasks
        foldersFlat.forEach(f => {
            if (f.tasks) {
                Object.entries(f.tasks).forEach(([tid, t]) => {
                    sourceTasks.push({id: tid, ...t, folderId: f.id});
                });
            }
        });
    }

    // Filter by search
    let filtered = sourceTasks.filter((t) =>
      (t.text || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter by tag
    if (tagFilter) {
        filtered = filtered.filter((t) => (t.tags || []).some((tg) => tg.label === tagFilter));
    }

    // Filter by View
    const todayStr = new Date().toISOString().split('T')[0];
    if (activeView === 'today') {
        filtered = filtered.filter(t => t.dueDate === todayStr);
    } else if (activeView === 'upcoming') {
        filtered = filtered.filter(t => t.dueDate && t.dueDate > todayStr);
    }
    // 'calendar' and 'sticky' are placeholders for now

    return filtered;
  }, [tasks, foldersFlat, activeView, searchQuery, tagFilter]);

  const availableTags = React.useMemo(() => {
      const all = new Set();
      foldersFlat.forEach(f => {
          if (f.tasks) {
              Object.values(f.tasks).forEach(t => {
                  if (t.tags) t.tags.forEach(tg => all.add(tg.label));
              });
          }
      });
      return Array.from(all);
  }, [foldersFlat]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.isActive).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  /* --- task & folder detail components (unchanged behavior, minor polish) --- */
  function TaskDetail({ taskId, onClose }) {
    // Find task (global or local)
    let task = tasks.find((t) => t.id === taskId);
    if (!task) {
         for (const f of foldersFlat) {
             if (f.tasks && f.tasks[taskId]) {
                 task = {id: taskId, ...f.tasks[taskId]};
                 break;
             }
         }
    }

    const [title, setTitle] = useState(task?.text || "");
    const [desc, setDesc] = useState(task?.description || "");
    const [color, setColor] = useState(task?.color || "var(--color-primary)");
    const [isActiveState, setIsActiveState] = useState(Boolean(task?.isActive));
    const [tagsList, setTagsList] = useState(task?.tags || []);
    const [dueDate, setDueDate] = useState(task?.dueDate || "");
    const [tagDraft, setTagDraft] = useState("");

    useEffect(() => {
      setTitle(task?.text || "");
      setDesc(task?.description || "");
      setColor(task?.color || "var(--color-primary)");
      setIsActiveState(Boolean(task?.isActive));
      setTagsList(task?.tags || []);
      setDueDate(task?.dueDate || "");
    }, [taskId]);

    if (!task) return null;

    const save = async () => {
      await updateTask(taskId, {
        text: title,
        description: desc,
        color,
        isActive: isActiveState,
        tags: tagsList,
        dueDate,
      });
      onClose?.();
    };

    const toggle = async () => {
      setIsActiveState((p) => !p);
      await updateTask(taskId, { isActive: !isActiveState });
    };

    const addLocalTag = () => {
      if (!tagDraft.trim()) return;
      setTagsList((p) => [
        ...p,
        { label: tagDraft.trim(), color: randomTagColor() },
      ]);
      setTagDraft("");
    };

    const removeLocalTag = (label) =>
      setTagsList((p) => p.filter((t) => t.label !== label));

    return (
      <motion.div
        className="detailWrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
      >
        <div className="detailHeader">
          <h3>Task</h3>
          <div className="detailBtns">
            <button className="primaryBtn" onClick={save}>
              Save
            </button>
            <button 
                className="ghostBtn" 
                style={{ color: 'var(--color-danger, #ff4d4d)' }}
                onClick={(e) => {
                    deleteTask(taskId, e);
                    onClose();
                }}
            >
              Delete
            </button>
            <button className="ghostBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="detailBody">
          <label>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />

          <label>Description</label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
          
          <label>Due Date</label>
          <input 
            type="date" 
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)} 
          />

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

          <label>Tags</label>
          <div className="tagEditor">
            <div className="tagInputRow">
              <input
                className="tagInput"
                placeholder="new tag"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
              />
              <button className="primaryBtn" onClick={addLocalTag}>
                +
              </button>
            </div>

            <div className="tagListEditor">
              {tagsList.map((tg) => (
                <span
                  key={tg.label}
                  className="tagPill"
                  style={{ background: tg.color }}
                >
                  {tg.label}
                  <button
                    className="tagX"
                    onClick={() => removeLocalTag(tg.label)}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  function FolderDetail({ folder, onClose }) {
    const [notes, setNotes] = useState(folder?.notes || "");
    const [color, setColor] = useState(folder?.color || "var(--color-primary)");
    useEffect(() => {
      setNotes(folder?.notes || "");
      setColor(folder?.color || "var(--color-primary)");
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
      >
        <div className="detailHeader">
          <h3>Folder</h3>
          <div className="detailBtns">
            <button className="primaryBtn" onClick={saveNotes}>
              Save
            </button>
            <button
              className="ghostBtn"
              style={{ color: 'var(--color-danger, #ff4d4d)' }}
              onClick={(e) => {
                deleteFolder(folder.id, e);
                if (onClose) onClose();
              }}
            >
              Delete
            </button>
            <button
              className="ghostBtn"
              onClick={() => {
                if (onClose) onClose();
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
              style={{ background: folder.color || "var(--color-primary)" }}
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

  /* --- Folder drag & drop handlers (reparent) --- */
  const onFolderDragStart = (e, folder) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    // set dataTransfer with folder id
    try {
      e.dataTransfer.setData("text/plain", folder.id);
    } catch {}
    // store draggingId on window for fallback
    window.__tdl_draggingFolderId = folder.id;
  };

  const onFolderDragOver = (e, folder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folder.id);
    e.dataTransfer.dropEffect = "move";
  };

  const onFolderDrop = async (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    const draggedId =
      (e.dataTransfer &&
        e.dataTransfer.getData &&
        e.dataTransfer.getData("text/plain")) ||
      window.__tdl_draggingFolderId;
    if (!draggedId) return;
    if (draggedId === targetFolder.id) return;
    // prevent dropping into own descendant
    const descendants = collectDescendants(draggedId, foldersFlat);
    if (descendants.includes(targetFolder.id)) {
      alert("Cannot move a folder into one of its descendants.");
      return;
    }

    // save previous parent for undo
    const dragged = foldersFlat.find((f) => f.id === draggedId);
    const previousParent = dragged?.parentId ?? null;

    // perform update
    await update(databaseRef(db, `users/${userId}/folders/${draggedId}`), {
      parentId: targetFolder.id,
    });

    // set undo info
    setRecentlyDeleted({
      type: "folder-move",
      id: draggedId,
      previousParent,
      data: { from: previousParent, to: targetFolder.id },
      timestamp: Date.now(),
    });

    // ensure target is expanded/visible by selecting it
    setCurrentFolderId(targetFolder.id);

    try {
      delete window.__tdl_draggingFolderId;
    } catch {}
  };

  /* --- view state --- */
  /* --- Render --- */
  return (
    <div className="tdl-root matched-layout">
      {/* Top bar (Mobile only or simplified) */}
      {isMobile && (
        <div className="topBar">
          <button
            className="sidebarToggle"
            onClick={() => setSidebarOpen((p) => !p)}
          >
            ☰
          </button>
          <div className="topTitle">
            {activeView === "folder"
              ? foldersFlat.find((f) => f.id === currentFolderId)?.text ||
                "Tasks"
              : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </div>
        </div>
      )}

      <div className="layoutFinder threeCol">
        {/* LEFT: Sidebar */}
        <aside
          className={`finderSidebar ${sidebarOpen ? "open" : "closed"}`}
          aria-hidden={!sidebarOpen && isMobile}
        >
          <div className="sidebarHeader">
            <h2>Menu</h2>
            {!isMobile && (
              <button
                className="sidebarToggle"
                onClick={() => setSidebarOpen((p) => !p)}
              >
                ☰
              </button>
            )}
          </div>

          <div className="sidebarSearch">
            <input
              className="searchInput"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sidebarSection">
            <div className="sectionTitle">TASKS</div>
            <ul className="navLinks">
              <li
                className={activeView === "upcoming" ? "active" : ""}
                onClick={() => {
                  setActiveView("upcoming");
                  setCurrentFolderId(null);
                }}
              >
                <span className="icon">»</span> Upcoming{" "}
                <span className="badge">12</span>
              </li>
              <li
                className={activeView === "today" ? "active" : ""}
                onClick={() => {
                  setActiveView("today");
                  setCurrentFolderId(null);
                }}
              >
                <span className="icon">📅</span> Today{" "}
                <span className="badge">5</span>
              </li>
              <li
                className={activeView === "calendar" ? "active" : ""}
                onClick={() => {
                  setActiveView("calendar");
                  setCurrentFolderId(null);
                }}
              >
                <span className="icon">🗓</span> Calendar
              </li>
              <li
                className={activeView === "sticky" ? "active" : ""}
                onClick={() => {
                  setActiveView("sticky");
                  setCurrentFolderId(null);
                }}
              >
                <span className="icon">📄</span> Sticky Wall
              </li>
            </ul>
          </div>

          <div className="sidebarSection">
            <div className="sectionTitle">LISTS</div>
            <div className="folderTreeWrap">
              <ul className="folderTree">
                {rootFolders.map((root) => (
                  <FolderNode
                    key={root.id}
                    folder={root}
                    depth={0}
                    childrenMap={childrenMap}
                    currentFolderId={currentFolderId}
                    setCurrentFolderId={(id) => {
                      setCurrentFolderId(id);
                      setActiveView("folder");
                    }}
                    addSubfolderUI={addSubfolderUI}
                    creatingUnder={creatingUnder}
                    setCreatingUnder={setCreatingUnder}
                    newFolderInput={newFolderInput}
                    setNewFolderInput={setNewFolderInput}
                    createFolderUnder={createFolderUnder}
                    deleteFolder={deleteFolder}
                    setShowFolderDetailMobile={setShowFolderDetailMobile}
                    isMobile={isMobile}
                    onFolderDragStart={onFolderDragStart}
                    onFolderDragOver={onFolderDragOver}
                    onFolderDrop={onFolderDrop}
                    dragOverFolderId={dragOverFolderId}
                  />
                ))}
              </ul>
            </div>
            <button
              className="addListBtn"
              onClick={() => {
                setCreatingUnder(null);
                setNewFolderInput(" ");
                // Trigger the input to show
              }}
            >
              + Add New List
            </button>
            {/* Root level create input */}
            {!creatingUnder && newFolderInput !== "" && (
               <div className="folderAddInline">
               <input
                 value={newFolderInput}
                 onChange={(e) => setNewFolderInput(e.target.value)}
                 placeholder="New List Name..."
                 onKeyDown={(e) => {
                    if (e.key === "Enter") createFolderUnder(null);
                 }}
               />
               <button onClick={() => createFolderUnder(null)}>Add</button>
             </div>
            )}
          </div>

          <div className="sidebarSection">
            <div className="sectionTitle">TAGS</div>
            <div className="tagListSidebar">
              {availableTags.map((tg) => (
                <button
                  key={tg}
                  className={`tagPill ${tagFilter === tg ? "active" : ""}`}
                  onClick={() => setTagFilter((p) => (p === tg ? null : tg))}
                >
                  {tg}
                </button>
              ))}
              <button
                className="addTagBtn"
                onClick={() => {
                   /* Placeholder for add tag */
                   alert("Tag management coming soon");
                }}
              >
                + Add Tag
              </button>
            </div>
          </div>

          <div className="sidebarFooter">
            <button className="footerLink" onClick={requestNotificationPermission}>🔔 Enable Notifications</button>
            <button className="footerLink">⚙ Settings</button>
            <button className="footerLink" onClick={() => auth.signOut()}>
              ↪ Sign out
            </button>
          </div>
        </aside>

        {/* CENTER: tasks */}
        <main className="mainContent">
          <div className="taskPane">
            <div className="paneHeaderBig">
              <div className="headerTitleRow">
                  <h1>
                    {activeView === "folder"
                      ? foldersFlat.find((f) => f.id === currentFolderId)?.text ||
                        "Select a List"
                      : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
                  </h1>
                  {activeView === "folder" && currentFolderId && (
                      <button 
                        className="ghostBtn smallBtn"
                        onClick={() => setIsAddingSubfolder(!isAddingSubfolder)}
                        title="Add Subfolder"
                      >
                        📂+
                      </button>
                  )}
              </div>
              <div className="bigCount">{visibleTasks.length}</div>
            </div>
            
            {isAddingSubfolder && (
                <div className="subfolderAddRow">
                    <input 
                        autoFocus
                        placeholder="New Subfolder Name..."
                        value={newFolderInput}
                        onChange={(e) => setNewFolderInput(e.target.value)}
                        onKeyDown={(e) => {
                            if(e.key === 'Enter') {
                                createFolderUnder(currentFolderId);
                                setIsAddingSubfolder(false);
                            }
                        }}
                    />
                    <button onClick={() => {
                        createFolderUnder(currentFolderId);
                        setIsAddingSubfolder(false);
                    }}>Add</button>
                </div>
            )}

            <div className="addTaskBig">
              <span className="plusIcon">+</span>
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Add New Task"
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask(e);
                }}
              />
            </div>

            <ul className="taskList">
              <React.Fragment>
                {/* Show subfolders first (only in folder view) */}
                {activeView === "folder" && currentFolderId && childrenMap[currentFolderId]?.map((subfolder) => {
                  const isExpanded = expandedFolders.has(subfolder.id);
                  const subfolderTasks = subfolder.tasks ? Object.entries(subfolder.tasks).map(([id, t]) => ({id, ...t})) : [];
                  
                  return (
                    <React.Fragment key={`folder-${subfolder.id}`}>
                      <li
                        className="folderRow"
                        onClick={(e) => {
                          // If clicking the expand icon, toggle expansion
                          if (e.target.closest('.expandIcon')) {
                            setExpandedFolders(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(subfolder.id)) {
                                newSet.delete(subfolder.id);
                              } else {
                                newSet.add(subfolder.id);
                              }
                              return newSet;
                            });
                          } else {
                            // Otherwise, show folder details
                            setSelectedTaskId(null);
                            setSelectedFolderId(subfolder.id);
                          }
                        }}
                      >
                        <div className="folderRowLeft">
                          <div 
                            className="folderIcon" 
                            style={{ background: subfolder.color || "var(--color-primary)" }}
                          >
                            {subfolder.emoji || "📁"}
                          </div>
                          <span className="folderName">{subfolder.text}</span>
                          <span className="taskCount">({subfolderTasks.length})</span>
                        </div>
                        <div className="folderRowRight">
                          <span className="expandIcon">{isExpanded ? "▼" : "▶"}</span>
                        </div>
                      </li>
                      
                      {/* Show tasks for this subfolder if expanded */}
                      {isExpanded && (
                        <div key={`nested-${subfolder.id}`} className="nestedTasksWrapper">
                          {subfolderTasks.map((t) => (
                            <div
                              key={`subfolder-task-${t.id}`}
                              className="taskRow nested"
                              onClick={() => setSelectedTaskId(t.id)}
                            >
                              <div className="taskLeft">
                                <input
                                  type="checkbox"
                                  className="customCheckbox"
                                  checked={t.isActive}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleTask(t.id, t.isActive, subfolder.id);
                                  }}
                                />
                                <div className="taskContent">
                                  <span className={`taskText ${t.isActive ? "finished" : ""}`}>
                                    {t.text}
                                  </span>
                                  <div className="taskMeta">
                                    {t.dueDate && <span className="metaItem">📅 {t.dueDate}</span>}
                                    {t.tags && t.tags.map(tg => (
                                      <span key={tg.label} className="metaTag" style={{backgroundColor: tg.color}}>{tg.label}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <div className="taskRight">
                                <span className="arrowIcon">›</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
                
                {/* Show tasks */}
                {visibleTasks.map((t) => {
                  const index = tasks.findIndex((x) => x.id === t.id);
                  return (
                    <li
                      key={t.id}
                      className={`taskRow ${selectedTaskId === t.id ? "selected" : ""}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, index)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, index)}
                      onClick={() => setSelectedTaskId(t.id)}
                    >
                      <div className="taskLeft">
                         <input
                            type="checkbox"
                            className="customCheckbox"
                            checked={t.isActive}
                            onChange={(e) => {
                                e.stopPropagation();
                                toggleTask(t.id, t.isActive);
                            }}
                         />
                        <div className="taskContent">
                            <span className={`taskText ${t.isActive ? "finished" : ""}`}>
                                {t.text}
                            </span>
                            <div className="taskMeta">
                                {t.dueDate && <span className="metaItem">📅 {t.dueDate}</span>}
                                {t.subtasks && <span className="metaItem">{t.subtasks} Subtasks</span>}
                                {t.tags && t.tags.map(tg => (
                                    <span key={tg.label} className="metaTag" style={{backgroundColor: tg.color}}>{tg.label}</span>
                                ))}
                            </div>
                        </div>
                      </div>
                      <div className="taskRight">
                        <span className="arrowIcon">›</span>
                      </div>
                    </li>
                  );
                })}
            </React.Fragment>
            </ul>
          </div>
        </main>

        {/* RIGHT: details */}
        <aside className="rightInfo equalHeight">
          <div className="rightPanelInner">
            <AnimatePresence mode="wait">
              {selectedTaskId ? (
                <TaskDetail
                  key={`task-${selectedTaskId}`}
                  taskId={selectedTaskId}
                  onClose={() => setSelectedTaskId(null)}
                />
              ) : selectedFolderId ? (
                <FolderDetail
                  key={`folder-${selectedFolderId}`}
                  folder={foldersFlat.find((f) => f.id === selectedFolderId)}
                  onClose={() => setSelectedFolderId(null)}
                />
              ) : currentFolderId ? (
                <FolderDetail
                  key={`folder-${currentFolderId}`}
                  folder={foldersFlat.find((f) => f.id === currentFolderId)}
                  onClose={() => setSelectedFolderId(null)}
                />
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <TaskDetail
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isMobile &&
          showFolderDetailMobile &&
          foldersFlat.find((f) => f.id === currentFolderId) && (
            <motion.div
              className="mobileOverlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FolderDetail
                folder={foldersFlat.find((f) => f.id === currentFolderId)}
              />
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  justifyContent: "center",
                }}
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

      {/* Undo / notifications */}
      {recentlyDeleted && (
        <div className="undoBar">
          <span>
            {recentlyDeleted.type === "task" && "Task deleted"}
            {recentlyDeleted.type === "folder-delete" &&
              `Folders deleted (${recentlyDeleted.ids.length})`}
            {recentlyDeleted.type === "folder-move" && "Folder moved"}
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
