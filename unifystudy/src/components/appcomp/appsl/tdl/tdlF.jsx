// src/components/tdl/TdlF.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebase";
import { ref, set, push, remove, onValue, update } from "firebase/database";
import "./tdlF.scss";

const TdlF = () => {
  const [userId, setUserId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);

  const [folderInput, setFolderInput] = useState("");
  const [taskInput, setTaskInput] = useState("");

  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFolderText, setEditFolderText] = useState("");
  const [editTaskText, setEditTaskText] = useState("");

  const [activeIndex, setActiveIndex] = useState(null);
  const [activeFIndex, setActiveFIndex] = useState(null);

  // --- Track auth ---
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUserId(user ? user.uid : null);
    });
    return () => unsub();
  }, []);

  // --- Load folders (and keep currentFolder in sync) ---
  useEffect(() => {
    if (!userId) return;
    const foldersRef = ref(db, `users/${userId}/folders`);
    const unsub = onValue(foldersRef, (snap) => {
      const data = snap.val() || {};
      const loaded = Object.entries(data).map(([id, val]) => ({ id, ...val }));
      setFolders(loaded);

      if (currentFolder) {
        const match = loaded.find((f) => f.id === currentFolder.id);
        if (match) setCurrentFolder(match);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // --- Add folder ---
  const handleAddFolder = async (e) => {
    e.preventDefault();
    if (!folderInput.trim() || !userId) return;
    try {
      const newFolderRef = push(ref(db, `users/${userId}/folders`));
      await set(newFolderRef, { text: folderInput, tasks: {} });
      setFolderInput("");
    } catch (err) {
      console.error("Add folder failed:", err);
    }
  };

  // --- Delete folder ---
  const handleDeleteFolder = async (id) => {
    if (!userId) return;
    try {
      await remove(ref(db, `users/${userId}/folders/${id}`));
      setFolders((prev) => prev.filter((f) => f.id !== id));
      if (currentFolder?.id === id) setCurrentFolder(null);
    } catch (err) {
      console.error("Delete folder failed:", err);
    }
  };

  // --- Edit folder name ---
  const applyFolderEdit = async (id) => {
    if (!editFolderText.trim() || !userId) {
      setEditingFolderId(null);
      return;
    }
    try {
      await update(ref(db, `users/${userId}/folders/${id}`), {
        text: editFolderText,
      });
      // Update locally
      setFolders((prev) =>
        prev.map((f) => (f.id === id ? { ...f, text: editFolderText } : f))
      );
      if (currentFolder?.id === id)
        setCurrentFolder((prev) => ({ ...prev, text: editFolderText }));
      setEditingFolderId(null);
    } catch (err) {
      console.error("Edit folder failed:", err);
    }
  };

  // --- Enter / Go back ---
  const enterFolder = (folder) => {
    setCurrentFolder(folder);
    setActiveIndex(null);
    setActiveFIndex(null);
    setEditingTaskId(null);
    setEditTaskText("");
  };
  const goBack = () => {
    setCurrentFolder(null);
    setActiveIndex(null);
    setActiveFIndex(null);
    setEditingTaskId(null);
    setEditTaskText("");
  };

  // --- Add task ---
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskInput.trim() || !userId || !currentFolder) return;
    try {
      const tasksRef = ref(
        db,
        `users/${userId}/folders/${currentFolder.id}/tasks`
      );
      const newTaskRef = push(tasksRef);
      const newTask = { text: taskInput, isActive: false };
      await set(newTaskRef, newTask);

      // Update UI immediately
      setCurrentFolder((prev) => ({
        ...prev,
        tasks: { ...prev.tasks, [newTaskRef.key]: newTask },
      }));
      setTaskInput("");
    } catch (err) {
      console.error("Add task failed:", err);
    }
  };

  // --- Delete task ---
  const handleDeleteTask = async (taskId) => {
    if (!userId || !currentFolder) return;

    // Update UI immediately
    setCurrentFolder((prev) => {
      if (!prev) return prev;
      const updatedTasks = { ...prev.tasks };
      delete updatedTasks[taskId];
      return { ...prev, tasks: updatedTasks };
    });

    try {
      await remove(
        ref(db, `users/${userId}/folders/${currentFolder.id}/tasks/${taskId}`)
      );
      setActiveIndex(null);
    } catch (err) {
      console.error("Delete task failed:", err);
    }
  };

  // --- Edit task ---
  const applyTaskEdit = async (taskId) => {
    if (!editTaskText.trim() || !userId || !currentFolder) {
      setEditingTaskId(null);
      return;
    }

    // Update UI immediately
    setCurrentFolder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: {
          ...prev.tasks,
          [taskId]: { ...prev.tasks[taskId], text: editTaskText },
        },
      };
    });

    try {
      await update(
        ref(db, `users/${userId}/folders/${currentFolder.id}/tasks/${taskId}`),
        { text: editTaskText }
      );
      setEditingTaskId(null);
      setEditTaskText("");
    } catch (err) {
      console.error("Edit task failed:", err);
    }
  };

  // --- Toggle complete ---
  const toggleTask = async (taskId, currentState) => {
    if (!userId || !currentFolder) return;

    // Update UI immediately
    setCurrentFolder((prev) => ({
      ...prev,
      tasks: {
        ...prev.tasks,
        [taskId]: { ...prev.tasks[taskId], isActive: !currentState },
      },
    }));

    try {
      await update(
        ref(db, `users/${userId}/folders/${currentFolder.id}/tasks/${taskId}`),
        { isActive: !currentState }
      );
    } catch (err) {
      console.error("Toggle task failed:", err);
    }
  };

  // --- Delete finished tasks ---
  const deleteAllFinishedTasks = async () => {
    if (!userId || !currentFolder) return;
    const tasksToDelete = Object.entries(currentFolder.tasks || {}).filter(
      ([_, t]) => t.isActive
    );

    // Update UI immediately
    setCurrentFolder((prev) => {
      if (!prev) return prev;
      const updatedTasks = { ...prev.tasks };
      tasksToDelete.forEach(([id]) => delete updatedTasks[id]);
      return { ...prev, tasks: updatedTasks };
    });

    try {
      tasksToDelete.forEach(([id]) => {
        remove(
          ref(db, `users/${userId}/folders/${currentFolder.id}/tasks/${id}`)
        );
      });
    } catch (err) {
      console.error("Delete finished tasks failed:", err);
    }
  };

  // animations
  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };
  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        {/* FOLDER VIEW */}
        {!currentFolder && (
          <motion.div
            key="folder-view"
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="appL"
          >
            <div className="titleCF flex">
              <h2>Your Folders</h2>
            </div>

            <form className="containerflex flex" onSubmit={handleAddFolder}>
              <div id="submitI" className="flex">
                <div className="flexC flex">
                  <input
                    type="text"
                    placeholder="Add New Folder"
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                  />
                  <button type="submit">+</button>
                </div>
              </div>
            </form>

            <div id="taskS">
              <ul id="taskListTD">
                <AnimatePresence>
                  {folders.map((folder, i) => (
                    <motion.li
                      key={folder.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                    >
                      <div className="listC">
                        <div className="divS">
                          {editingFolderId === folder.id ? (
                            <input
                              type="text"
                              value={editFolderText}
                              onChange={(e) =>
                                setEditFolderText(e.target.value)
                              }
                              onBlur={() => applyFolderEdit(folder.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  applyFolderEdit(folder.id);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <span onClick={() => enterFolder(folder)}>
                              {folder.text}
                            </span>
                          )}
                        </div>

                        <span
                          className={`buttonS ${
                            activeFIndex === i ? "active" : ""
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setActiveFIndex(activeFIndex === i ? null : i)
                            }
                          >
                            <span className="span1"></span>
                            <span className="span2"></span>
                          </button>
                        </span>

                        <div
                          className={`lOption ${
                            activeFIndex === i ? "active" : ""
                          }`}
                        >
                          <div className="flexcL">
                            <button
                              type="button"
                              className="listDelete"
                              onClick={() => handleDeleteFolder(folder.id)}
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              className="listFinished"
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditFolderText(folder.text || "");
                              }}
                            >
                              Edit Name
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          </motion.div>
        )}

        {/* TASK VIEW */}
        {currentFolder && (
          <motion.div
            key="task-view"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="appL"
          >
            <div className="titleC flex">
              <h2>{currentFolder.text}</h2>
              <button type="button" onClick={goBack} className="backB">
                back()
              </button>
            </div>

            <form className="containerflex flex" onSubmit={handleAddTask}>
              <div id="submitI" className="flex">
                <div className="flexC flex">
                  <input
                    type="text"
                    placeholder="Add New Task"
                    value={taskInput}
                    onChange={(e) => setTaskInput(e.target.value)}
                  />
                  <button type="submit">+</button>
                </div>
              </div>
            </form>

            <div id="taskS">
              <ul id="taskListTD">
                <AnimatePresence>
                  {currentFolder.tasks &&
                  Object.keys(currentFolder.tasks).length > 0 ? (
                    Object.entries(currentFolder.tasks).map(
                      ([taskId, task], i) => (
                        <motion.li
                          key={taskId}
                          variants={itemVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ duration: 0.25 }}
                        >
                          <div className="listC">
                            <div className="divS">
                              <button
                                type="button"
                                className={`finish ${
                                  task.isActive ? "active" : ""
                                }`}
                                onClick={() =>
                                  toggleTask(taskId, task.isActive)
                                }
                              ></button>

                              {editingTaskId === taskId ? (
                                <input
                                  type="text"
                                  value={editTaskText}
                                  onChange={(e) =>
                                    setEditTaskText(e.target.value)
                                  }
                                  onBlur={() => applyTaskEdit(taskId)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      applyTaskEdit(taskId);
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span
                                  className={task.isActive ? "activeText" : ""}
                                >
                                  {task.text}
                                </span>
                              )}
                            </div>

                            <span
                              className={`buttonS ${
                                activeIndex === i ? "active" : ""
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveIndex(activeIndex === i ? null : i)
                                }
                              >
                                <span className="span1"></span>
                                <span className="span2"></span>
                              </button>
                            </span>

                            <div
                              className={`lOption ${
                                activeIndex === i ? "active" : ""
                              }`}
                            >
                              <div className="flexcL">
                                <button
                                  type="button"
                                  className="listDelete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(taskId);
                                  }}
                                >
                                  Delete
                                </button>
                                <button
                                  type="button"
                                  className="listFinished"
                                  onClick={() => {
                                    setEditingTaskId(taskId);
                                    setEditTaskText(task.text || "");
                                  }}
                                >
                                  Edit Name
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.li>
                      )
                    )
                  ) : (
                    <p>No tasks yet.</p>
                  )}
                </AnimatePresence>
              </ul>
            </div>

            <div className="aS flex">
              <button
                type="button"
                onClick={deleteAllFinishedTasks}
                className="deleteActiveBtn"
              >
                Delete <span style={{ color: "#afd4ed" }}>()</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TdlF;
