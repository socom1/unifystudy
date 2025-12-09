// /mnt/data/tdlF.jsx
// Updated: visual polish + folder drag/drop reparenting + recursive delete + quick-tag add + tagFilter persistence
// Keep your firebase setup (db, auth). Uses Realtime DB paths:
// users/{uid}/folders/{folderId} and users/{uid}/folders/{folderId}/tasks/{taskId}

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import {
  ref as databaseRef,
  push,
  set,
  remove,
  onValue,
  update,
} from "firebase/database";
import { Menu, ArrowLeft, Check, X, Trash2, Folder, ChevronRight, ChevronDown, Plus } from "lucide-react";
import Modal from "../../../common/Modal"; // Import shared Modal
import "./tdlF.scss";

// Add this style block or ensure it's in tdlF.scss
// .glowing-tag {
//   color: #fff;
//   padding: 2px 8px;
//   border-radius: 12px;
//   font-size: 0.75rem;
//   font-weight: 600;
//   text-shadow: 0 1px 2px rgba(0,0,0,0.3);
// }

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
  // Workspace-style folder toggle needs local state or reuse currentFolderId logic
  // Here we use isOpen to imply "expanded" but for file tree we might want separate expand state vs selection
  // For now, let's stick to the current logic: clicking toggles "Open/Selected" 
  
  return (
    <li
      className={`folderNode ${dragOverFolderId === folder.id ? "dropTarget" : ""}`}
      draggable
      onDragStart={(e) => onFolderDragStart(e, folder)}
      onDragOver={(e) => onFolderDragOver(e, folder)}
      onDrop={(e) => onFolderDrop(e, folder)}
    >
      <div
        className={`folderRow ${isOpen ? "active" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        onClick={(e) => {
          e.stopPropagation();
          setCurrentFolderId((p) => (p === folder.id ? null : folder.id));
        }}
        role="button"
      >
        <span className="chevron">
           {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} 
        </span>

        <span className="folderIcon">
          <Folder size={16} />
        </span>

        <span className="folderName">{folder.text}</span>

        <div className="folderActions">
           <button
            title="Add subfolder"
            onClick={(e) => {
              e.stopPropagation();
              addSubfolderUI(folder.id);
            }}
          >
            <Plus size={14} />
          </button>
          
          <button
            title="Delete folder"
            onClick={(e) => {
              e.stopPropagation();
              deleteFolder(folder.id, e);
            }}
          >
            <X size={14} />
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
  const [isLargeScreen, setIsLargeScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1000 : false
  );
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Resizable state
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [rightPanelWidth, setRightPanelWidth] = useState(320);
  const draggingRef = useRef(null); // 'sidebar' | 'rightPanel' | null

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const m = w < 900;
      setIsMobile(m);
      if (!m) setSidebarOpen(true);
      
      setIsLargeScreen(w >= 1000);
    };
    window.addEventListener("resize", onResize);
    onResize(); // initial check
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* --- Resizing Logic --- */
  // Use refs for start positions to avoid closure staleness without re-binding
  const resizeStart = useRef({ x: 0, w: 0 });

  const startResizingSidebar = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = 'sidebar';
    resizeStart.current = { x: e.clientX, w: sidebarWidth };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none"; 
  }, [sidebarWidth]);

  const startResizingRightPanel = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = 'rightPanel';
    resizeStart.current = { x: e.clientX, w: rightPanelWidth };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResizing);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [rightPanelWidth]);

  const handleMouseMove = useCallback((e) => {
    if (!draggingRef.current) return;
    
    if (draggingRef.current === 'sidebar') {
      const delta = e.clientX - resizeStart.current.x;
      const newWidth = Math.max(200, Math.min(600, resizeStart.current.w + delta));
      setSidebarWidth(newWidth);
    } else if (draggingRef.current === 'rightPanel') {
      // Right panel grows to the left, so delta is inverted
      const delta = resizeStart.current.x - e.clientX;
      const newWidth = Math.max(250, Math.min(600, resizeStart.current.w + delta));
      setRightPanelWidth(newWidth);
    }
  }, []);

  const stopResizing = useCallback(() => {
    draggingRef.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResizing);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);


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
  
  // Tag Modal State
  const [showTagModal, setShowTagModal] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [activeTagTaskId, setActiveTagTaskId] = useState(null);

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
        if (activeView === "folder") setCurrentFolderId(null);
      }
    });
    return () => unsub();
  }, [userId, currentFolderId, activeView]);

  /* --- tasks load for folder --- */
  useEffect(() => {
    if (!userId || !currentFolderId || activeView !== "folder") {
      if (activeView === "folder") setTasks([]);
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
      const todayStr = now.toLocaleDateString("en-CA");

      // Check all tasks in all folders
      foldersFlat.forEach((folder) => {
        if (!folder.tasks) return;
        Object.values(folder.tasks).forEach((task) => {
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
        alert("Notifications enabled successfully! ✅");
      } else {
        alert(
          "Permission denied. Please enable notifications in your browser settings."
        );
      }
    });
  };

  const safePushTask = useCallback(
    async (folderId, taskObj) => {
      if (!userId || !folderId) return null;
      const tasksRef = databaseRef(
        db,
        `users/${userId}/folders/${folderId}/tasks`
      );
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
      emoji: null, // Removed emoji
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
    await update(databaseRef(db, `users/${userId}/folders/${folderId}`), {
      color,
    });
  };

  const setFolderNotes = async (folderId, notes) => {
    if (!userId) return;
    await update(databaseRef(db, `users/${userId}/folders/${folderId}`), {
      notes,
    });
  };

  /* --- tasks CRUD --- */
  const addTask = async (e) => {
    e?.preventDefault();
    if (!taskInput.trim() || !userId) return;

    // Use current folder, or fallback to first available folder, or create a default "Inbox" if totally empty
    let targetFolderId = currentFolderId;
    if (!targetFolderId) {
       // If in a special view like "Today" or "Upcoming", we still need a physical folder to store the task.
       // Try to find an "Inbox" folder or use the first one.
       const inbox = foldersFlat.find(f => f.text === "Inbox");
       if (inbox) targetFolderId = inbox.id;
       else if (foldersFlat.length > 0) targetFolderId = foldersFlat[0].id;
       else {
          // No folders at all, create one? For now just return or alert.
          alert("Please create a folder first to store tasks!");
          return;
       }
    }

    const newTaskRef = push(
      databaseRef(db, `users/${userId}/folders/${targetFolderId}/tasks`)
    );
    const newId = newTaskRef.key;

    // Auto-set due date if in Today view
    let initialDueDate = "";
    if (activeView === 'today') {
       initialDueDate = new Date().toLocaleDateString("en-CA");
    }

    const newTask = {
      text: taskInput.trim(),
      isActive: false,
      order: Date.now(),
      description: "",
      color: folderColor,
      tags: [],
      dueDate:
        activeView === "today" ? new Date().toLocaleDateString("en-CA") : "",
    };
    await safePushTask(targetFolderId, taskObj);
    setTaskInput("");
  };

  const updateTask = async (taskId, payload) => {
    if (!userId) return;
    let fid = currentFolderId;
    if (!fid) {
      const found = foldersFlat.find((f) => f.tasks && f.tasks[taskId]);
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
    if (activeView === "folder") {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, isActive: !currentState } : t
        )
      );
    }

    let fid = folderId || currentFolderId;
    if (!fid) {
      const found = foldersFlat.find((f) => f.tasks && f.tasks[taskId]);
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
      const found = foldersFlat.find((f) => f.tasks && f.tasks[taskId]);
      if (found) {
        fid = found.id;
        taskData = found.tasks[taskId];
      }
    } else {
      taskData = tasks.find((t) => t.id === taskId);
    }

    if (!fid) return;

    setRecentlyDeleted({
      type: "task",
      folderId: fid,
      id: taskId,
      data: taskData,
      timestamp: Date.now(),
    });

    if (activeView === "folder") {
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
      alert(
        "Recursive folder delete can't be fully restored automatically. Consider exporting data or re-creating."
      );
    } else if (type === "folder-move") {
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
  };

  const quickAddTagFromRow = (taskId) => {
    setActiveTagTaskId(taskId);
    setTagInput("");
    setShowTagModal(true);
  };

  const handleSaveTag = async (e) => {
    e?.preventDefault();
    if (!activeTagTaskId || !tagInput.trim()) return;

    let task = tasks.find((t) => t.id === activeTagTaskId);
    if (!task) {
      for (const f of foldersFlat) {
        if (f.tasks && f.tasks[activeTagTaskId]) {
          task = { id: activeTagTaskId, ...f.tasks[activeTagTaskId] };
          break;
        }
      }
    }
    if (task) {
      const newTag = { label: tagInput.trim(), color: randomTagColor() };
      const newTags = [...(task.tags || []), newTag];
      await updateTask(activeTagTaskId, { tags: newTags });
    }

    setShowTagModal(false);
    setTagInput("");
    setActiveTagTaskId(null);
  };

  /* --- task drag helpers --- (same as before) */
  const onDragStart = (e, idx) => {
    if (activeView !== "folder") return;
    dragState.current.draggingIndex = idx;
    const folderColor =
      foldersFlat.find((f) => f.id === currentFolderId)?.color ||
      "var(--color-primary)";
    const title = (tasks[idx]?.text || "Task").replace(/</g, "&lt;");
    // createGhost(title, folderColor); // Ghost creation omitted for brevity if not used
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
    if (activeView !== "folder") return;
    const dragIndex = dragState.current.draggingIndex;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const newTasks = [...tasks];
    const [moved] = newTasks.splice(dragIndex, 1);
    newTasks.splice(dropIndex, 0, moved);

    setTasks(newTasks);

    const orderedIds = newTasks.map((t) => t.id);
    persistTaskOrder(currentFolderId, orderedIds);

    dragState.current.draggingIndex = null;
  };

  /* --- filters & visible tasks --- */
  const visibleTasks = React.useMemo(() => {
    let sourceTasks = [];

    if (activeView === "folder") {
      sourceTasks = tasks;
    } else {
      foldersFlat.forEach((f) => {
        if (f.tasks) {
          Object.entries(f.tasks).forEach(([tid, t]) => {
            sourceTasks.push({ id: tid, ...t, folderId: f.id });
          });
        }
      });
    }

    let filtered = sourceTasks.filter((t) =>
      (t.text || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (tagFilter) {
      filtered = filtered.filter((t) =>
        (t.tags || []).some((tg) => tg.label === tagFilter)
      );
    }

    const now = new Date();
    // Get local date string YYYY-MM-DD
    const todayStr = now.toLocaleDateString("en-CA"); // en-CA gives YYYY-MM-DD format

    if (activeView === "today") {
      filtered = filtered.filter((t) => t.dueDate === todayStr);
    } else if (activeView === "upcoming") {
      filtered = filtered.filter((t) => t.dueDate && t.dueDate > todayStr);
    }

    return filtered;
  }, [tasks, foldersFlat, activeView, searchQuery, tagFilter]);

  const availableTags = React.useMemo(() => {
    const all = new Set();
    foldersFlat.forEach((f) => {
      if (f.tasks) {
        Object.values(f.tasks).forEach((t) => {
          if (t.tags) t.tags.forEach((tg) => all.add(tg.label));
        });
      }
    });
    return Array.from(all);
  }, [foldersFlat]);

  const total = tasks.length;
  const completed = tasks.filter((t) => t.isActive).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  /* --- task & folder detail components --- */
  function TaskDetail({ taskId, onClose }) {
    let task = tasks.find((t) => t.id === taskId);
    if (!task) {
      for (const f of foldersFlat) {
        if (f.tasks && f.tasks[taskId]) {
          task = { id: taskId, ...f.tasks[taskId] };
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
      // updating local toggle
      if (activeView === "folder" && currentFolderId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  text: title,
                  description: desc,
                  color,
                  isActive: isActiveState,
                  tags: tagsList,
                  dueDate,
                }
              : t
          )
        );
      }
      // onClose(); // optional auto-close
    };

    const addTag = () => {
      if (!tagDraft.trim()) return;
      const newTag = { label: tagDraft.trim(), color: randomTagColor() };
      setTagsList([...tagsList, newTag]);
      setTagDraft("");
    };
    const removeTag = (idx) => {
      const copy = [...tagsList];
      copy.splice(idx, 1);
      setTagsList(copy);
    };

    return (
      <div className="panel-inner">
        <div className="detail-header">
          <h3>Task Details</h3>
          <div className="actions">
            <button className="primary" onClick={save}>
              Save
            </button>
            <button
              className="danger"
              onClick={(e) => {
                const ok = window.confirm("Delete this task?");
                if (ok) {
                  deleteTask(taskId);
                  onClose();
                }
              }}
            >
              Delete
            </button>
            <button onClick={onClose} className="close-btn">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="detail-body">
          <div className="field-group">
            <label>Task Name</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={save}
            />
          </div>

          <div className="field-group">
            <label>Status</label>
            <div
              className="checkbox-row"
              style={{ display: "flex", gap: "10px", alignItems: "center" }}
            >
              <div
                className={`checkbox ${isActiveState ? "checked" : ""}`}
                onClick={() => setIsActiveState(!isActiveState)}
              >
                {isActiveState && (
                  <Check size={14} color="var(--bg-1)" strokeWidth={3} />
                )}
              </div>
              <span
                style={{
                  fontSize: "0.9rem",
                  color: isActiveState ? "var(--color-muted)" : "#fff",
                  textDecoration: isActiveState ? "line-through" : "none",
                }}
              >
                {isActiveState ? "Completed" : "Active"}
              </span>
            </div>
          </div>

          <div className="field-group">
            <label>Tags</label>
            <div className="tag-editor">
              <div className="tags-list">
                {tagsList.map((tag, i) => (
                  <div
                    key={i}
                    className="tag-pill"
                    style={{ background: tag.color }}
                  >
                    {tag.label}
                    <button onClick={() => removeTag(i)}>×</button>
                  </div>
                ))}
              </div>
              <div className="tag-input-row">
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  placeholder="New tag..."
                  onKeyDown={(e) => e.key === "Enter" && addTag()}
                />
                <button onClick={addTag}>Add</button>
              </div>
            </div>
          </div>

          <div className="field-group">
            <label>Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Add details / notes..."
              onBlur={save}
            />
          </div>

          <div className="field-group">
            <label>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={save}
            />
          </div>
        </div>
      </div>
    );
  }

  function FolderDetail({ folderId, onClose }) {
    const folder = foldersFlat.find((f) => f.id === folderId);
    
    // We need local state to edit folder details
    const [fName, setFName] = useState(folder?.text || "");
    const [fColor, setFColor] = useState(folder?.color || "var(--color-primary)");
    const [fNotes, setFNotes] = useState(folder?.notes || "");

    useEffect(() => {
      setFName(folder?.text || "");
      setFColor(folder?.color || "var(--color-primary)");
      setFNotes(folder?.notes || "");
    }, [folderId, folder]);

    if (!folder) return null;

    const saveFolder = async () => {
      if (!userId) return;
      await update(databaseRef(db, `users/${userId}/folders/${folderId}`), {
        text: fName,
        color: fColor,
        notes: fNotes,
      });
    };

    return (
      <div className="panel-inner detailWrap">
        <div className="detail-header">
           {/* If editing a folder, we might want to say "Folder Details" */}
           <h3>Folder Details</h3>
           <button onClick={onClose} className="close-btn">
              <X size={18} />
           </button>
        </div>

        <div className="folderNameInline">
          <div
            className="folderIconPreview"
            style={{ background: fColor }}
          >
            {folder.emoji || "📁"}
          </div>
          <div className="folderNameText">{fName}</div>
        </div>

        <div className="detail-body">
          <div className="field-group">
            <label>Folder Name</label>
            <input
               value={fName} 
               onChange={(e) => setFName(e.target.value)} 
               onBlur={saveFolder}
            />
          </div>
          <div className="field-group">
            <label>Color</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {[
                "var(--color-primary)",
                "var(--color-secondary)",
                "#ff6b6b",
                "#feca57",
                "#48dbfb",
                "#1dd1a1",
              ].map((c) => (
                <div
                  key={c}
                  onClick={() => {
                    setFColor(c);
                    // trigger save immediately for color
                    update(databaseRef(db, `users/${userId}/folders/${folderId}`), { color: c });
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c,
                    cursor: "pointer",
                    border: fColor === c ? "2px solid #fff" : "none",
                    boxShadow: fColor === c ? "0 0 0 2px var(--bg-1)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
          <div className="field-group">
            <label>Notes</label>
            <textarea
              value={fNotes}
              onChange={(e) => setFNotes(e.target.value)}
              onBlur={saveFolder}
              placeholder="Folder notes..."
            />
          </div>
        </div>

        <div className="detail-footer">
          <button
            className="danger"
            onClick={(e) => {
              deleteFolder(folderId, e);
              onClose();
            }}
          >
            Delete Folder
          </button>
        </div>
      </div>
    );
  }

  /* --- ghost drag image --- */
  return (
    <div className={`tdl-root ${!sidebarOpen ? "collapsed" : ""} ${isLargeScreen ? "resizable-layout" : ""}`}>
      {/* Ghost Element for drag image */}
      <div
        ref={ghostEl}
        style={{
          position: "absolute",
          top: -1000,
          left: -1000,
          background: "var(--color-primary)",
          padding: "8px 12px",
          borderRadius: "8px",
          color: "#000",
          fontWeight: "bold",
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        Dragging Task...
      </div>

      {!isLargeScreen && isMobile && (
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          style={{
            position: "absolute",
            top: "1rem",
            left: "1rem",
            zIndex: 100,
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            padding: "8px",
            borderRadius: "8px",
            color: "var(--color-text)",
          }}
        >
          <Menu size={20} />
        </button>
      )}

      {/* --- SIDEBAR --- */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile || isLargeScreen) && (
          <motion.div
            className={`sidebar ${isMobile && !isLargeScreen ? "drawer" : ""}`}
            style={isLargeScreen ? { width: sidebarWidth } : {}}
            initial={isMobile && !isLargeScreen ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {isMobile && !isLargeScreen && (
              <div
                className="drawer-backdrop"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <div className="sidebar-header">
              <h2>My Lists</h2>
              {isMobile && !isLargeScreen && (
                <button
                  onClick={() => setSidebarOpen(false)}
                  style={{ background: "none", border: "none", color: "white" }}
                >
                  <ArrowLeft size={18} />
                </button>
              )}
            </div>

            <div className="sidebar-content">
              {/* Special Views */}
              <div className="sidebar-section">
                <div className="section-title">VIEWS</div>
                <ul>
                  {[
                    { id: "upcoming", label: "Upcoming", icon: "📅" },
                    { id: "today", label: "Today", icon: "☀️" },
                    { id: "favorites", label: "Favorites", icon: "⭐️" },
                  ].map((item) => (
                    <li
                      key={item.id}
                      className={`nav-item ${
                        activeView === item.id ? "active" : ""
                      }`}
                      onClick={() => {
                        setActiveView(item.id);
                        if (isMobile) setSidebarOpen(false);
                      }}
                    >
                      <span className="icon">{item.icon}</span>
                      <span>{item.label}</span>
                      {/* Optional badge */}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Folders Tree */}
              <div className="sidebar-section" style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div className="section-title">FOLDERS</div>
                  <button
                    onClick={() => addSubfolderUI(null)}
                    title="New Root Folder"
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    +
                  </button>
                </div>

                {isAddingSubfolder && creatingUnder === null && (
                  <div className="subfolderInline">
                    <input
                      value={newFolderInput}
                      autoFocus
                      placeholder="New Folder..."
                      onChange={(e) => setNewFolderInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") createFolderUnder(null);
                        else if (e.key === "Escape") setCreatingUnder(null);
                      }}
                    />
                    <button onClick={() => createFolderUnder(null)}>Add</button>
                    <button onClick={() => setCreatingUnder(null)}>X</button>
                  </div>
                )}

                <ul className="folder-tree">
                  {rootFolders.map((f) => (
                    <FolderNode
                      key={f.id}
                      folder={f}
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
                      // Folder DND logic
                      onFolderDragStart={(e, folder) => {
                        e.dataTransfer.setData("application/json", JSON.stringify(folder));
                      }}
                      onFolderDragOver={(e, folder) => {
                         e.preventDefault();
                         setDragOverFolderId(folder.id);
                      }}
                      onFolderDrop={async (e, targetFolder) => {
                         e.preventDefault();
                         setDragOverFolderId(null);
                         const data = e.dataTransfer.getData("application/json");
                         if (!data) return;
                         const draggedFolder = JSON.parse(data);
                         if (draggedFolder.id === targetFolder.id) return;
                         
                         // Prevent circular parent reference if moving parent into child
                         const descendants = collectDescendants(draggedFolder.id, foldersFlat);
                         if (descendants.includes(targetFolder.id)) {
                           alert("Cannot move a folder into its own subfolder.");
                           return;
                         }

                         setRecentlyDeleted({
                           type: "folder-move",
                           id: draggedFolder.id,
                           previousParent: draggedFolder.parentId,
                         });
                         
                         // Update parentId in firebase
                         await update(databaseRef(db, `users/${userId}/folders/${draggedFolder.id}`), {
                            parentId: targetFolder.id
                         });
                      }}
                      dragOverFolderId={dragOverFolderId}
                    />
                  ))}
                  {rootFolders.length === 0 && (
                    <li
                      style={{
                        padding: "1rem",
                        color: "var(--color-muted)",
                        fontStyle: "italic",
                        fontSize: "0.85rem",
                        textAlign: "center",
                      }}
                    >
                      No folders yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <div className="sidebar-footer">
              <button 
                 onClick={requestNotificationPermission}
                 style={{ display: "flex", gap: "0.5rem", alignItems: "center"}}
              >
                 <span>🔔</span> Enable Notifications
              </button>
              {recentlyDeleted && (
                <button
                  onClick={undoDelete}
                  style={{
                    color: "var(--color-primary)",
                    marginTop: "0.5rem",
                  }}
                >
                  ↩ Undo Delete
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resize Handle Left */}
      {isLargeScreen && (
        <div
          className="resize-handle left-handle"
          onMouseDown={startResizingSidebar}
        />
      )}

      {/* --- MAIN AREA --- */}
      <div className="main-content">
        <header>
          <h1>
            {activeView === "folder"
              ? foldersFlat.find((f) => f.id === currentFolderId)?.text ||
                "Select a Folder"
              : activeView.charAt(0).toUpperCase() + activeView.slice(1)}
          </h1>
          <div style={{ display: "flex", gap: "1rem" }}>
            {/* Tag Filter Dropdown */}
            {availableTags.length > 0 && (
              <select
                value={tagFilter || ""}
                onChange={(e) => setTagFilter(e.target.value || null)}
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "#fff",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  fontSize: "0.85rem",
                }}
              >
                <option value="">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>
        </header>

        {/* New Task Input (Top) */}
        <div className="tasks-area">
          <div className="task-input-wrapper">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask(e)}
              placeholder="Add a new task..."
            />
          </div>

          <div
            className="tasks-list"
            onDragOver={onDragOver} // Allow drop on list area
          >
            {visibleTasks.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "3rem",
                  color: "var(--color-muted)",
                }}
              >
                <p>No tasks found.</p>
              </div>
            ) : (
              visibleTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`task-item ${task.isActive ? "completed" : ""}`}
                  draggable={activeView === "folder"}
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDrop={(e) => onDrop(e, idx)}
                  onDragOver={onDragOver}
                  onClick={() => {
                    setSelectedTaskId(task.id);
                    if (activeView !== "folder" && task.folderId) {
                      setCurrentFolderId(task.folderId);
                    }
                  }}
                  // Mobile Swipe Handlers
                  onTouchStart={(e) => {
                    e.currentTarget.dataset.startX = e.changedTouches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    const startX = parseFloat(e.currentTarget.dataset.startX);
                    const endX = e.changedTouches[0].clientX;
                    const diff = endX - startX;
                    if (Math.abs(diff) < 50) return; // ignore small swipes

                    if (diff > 100) { 
                      // Swipe Right -> Toggle Complete
                      toggleTask(task.id, task.isActive, task.folderId); 
                    } else if (diff < -100) {
                      // Swipe Left -> Delete
                      if (window.confirm("Delete task?")) {
                          deleteTask(task.id);
                      }
                    }
                  }}
                  style={{
                    borderLeft: `4px solid ${task.color || "transparent"}`,
                  }}
                >
                  <div
                    className={`checkbox ${task.isActive ? "checked" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(task.id, task.isActive, task.folderId);
                    }}
                  >
                    {task.isActive && (
                      <Check size={14} color="var(--bg-1)" strokeWidth={3} />
                    )}
                  </div>

                  <div className="task-content">
                    <span className="task-text">{task.text}</span>
                    <div className="task-meta">
                      {task.dueDate && (
                        <span>
                           📅 {task.dueDate} 
                           {task.dueDate === new Date().toLocaleDateString("en-CA") && " (Today)"}
                        </span>
                      )}
                      {task.tags &&
                        task.tags.map((tg, i) => (
                          <span
                            key={i}
                            className="meta-tag"
                            style={{ color: tg.color }}
                          >
                            #{tg.label}
                          </span>
                        ))}
                    </div>
                  </div>

                  <button
                    className="quick-actions"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickAddTagFromRow(task.id);
                    }}
                    title="Add Tag"
                    style={{
                      background: "none",
                      border: "none",
                      opacity: 0.5,
                      cursor: "pointer",
                      color: "var(--color-text)",
                    }}
                  >
                     +🏷️
                  </button>

                  <button
                    className="delete-task-btn"
                    onClick={(e) => deleteTask(task.id, e)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-muted)",
                      opacity: 0.5,
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Resize Handle Right */}
      {isLargeScreen && (
         <div 
            className="resize-handle right-handle"
            onMouseDown={startResizingRightPanel}
         />
      )}

      {/* --- RIGHT PANEL (Details) --- */}
      {/* 
         Logic:
         If selectedTaskId is present -> Show Task Detail
         Else if currentFolderId is present -> Show Folder Detail (so user can edit folder info)
         But only show if right panel is supposed to be visible.
         On Large Screen: Always visible (Column 3).
         On Mobile: Controlled by sidebar/drawer logic or overlays.
      */}
      
      {isLargeScreen ? (
        <div className="right-panel" style={{ width: rightPanelWidth }}>
          {selectedTaskId ? (
            <TaskDetail
              taskId={selectedTaskId}
              onClose={() => setSelectedTaskId(null)}
            />
          ) : currentFolderId ? (
            <FolderDetail
               folderId={currentFolderId}
               onClose={() => setCurrentFolderId(null)} 
            />
          ) : (
            <div style={{ padding: "2rem", color: "var(--color-muted)", textAlign: "center" }}>
              <p>Select a task or folder to view details</p>
            </div>
          )}
        </div>
      ) : (
         /* Mobile / Tablet Overlays */
         <>
            <AnimatePresence>
               {selectedTaskId && (
                  <motion.div 
                     className="right-panel fixed-overlay"
                     initial={{ x: "100%" }}
                     animate={{ x: 0 }}
                     exit={{ x: "100%" }}
                  >
                     <TaskDetail 
                        taskId={selectedTaskId}
                        onClose={() => setSelectedTaskId(null)}
                     />
                  </motion.div>
               )}
            </AnimatePresence>

            <AnimatePresence>
               {(showFolderDetailMobile && currentFolderId) && (
                  <motion.div 
                     className="right-panel fixed-overlay"
                     initial={{ x: "100%" }}
                     animate={{ x: 0 }}
                     exit={{ x: "100%" }}
                  >
                     <FolderDetail 
                        folderId={currentFolderId}
                        onClose={() => setShowFolderDetailMobile(false)}
                     />
                  </motion.div>
               )}
            </AnimatePresence>
         </>
      )}
      
      {/* Shared Modal Implementation */}
      <Modal
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        title="Add Tag"
        footer={(
          <>
            <button className="btn-secondary" onClick={() => setShowTagModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveTag}>Add Tag</button>
          </>
        )}
      >
        <form onSubmit={handleSaveTag}>
          <div className="form-group">
            <label>Tag Label</label>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. Important, School, Work"
              autoFocus
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
