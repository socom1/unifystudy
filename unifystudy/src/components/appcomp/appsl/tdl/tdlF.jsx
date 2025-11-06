import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./tdlF.scss";

const TdlF = () => {
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem("folders");
    return saved ? JSON.parse(saved) : [];
  });

  const [folderInput, setFolderInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [tasks, setTasks] = useState([]);
  const [finishTask, setFinishTask] = useState(false);

  const [activeIndex, setActiveIndex] = useState(null);
  const [activeFIndex, setActiveFIndex] = useState(null);
  const [lineActive, setLineActive] = useState(null);

  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editFolderText, setEditFolderText] = useState("");
  const [editTaskText, setEditTaskText] = useState("");

  useEffect(() => {
    localStorage.setItem("folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= tasks.length) {
      setActiveIndex(null);
      setActiveFIndex(null);
    }
  }, [tasks, activeIndex]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest(".lOption") && !e.target.closest(".buttonS")) {
        setActiveIndex(null);
        setActiveFIndex(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const enterFolder = (folder) => {
    setCurrentFolder(folder);
    setTasks(folder.tasks || []);
    setActiveIndex(null);
    setActiveFIndex(null);
  };

  const goBack = () => {
    setCurrentFolder(null);
    setTasks([]);
    setActiveIndex(null);
    setActiveFIndex(null);
  };

  const deleteAllFinishedTasks = () => {
    const updatedTasks = tasks.filter((t) => !t.isActive);
    setTasks(updatedTasks);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: updatedTasks } : f
      )
    );
  };

  const handleAddFolder = (e) => {
    e.preventDefault();
    if (!folderInput.trim()) return;

    const newFolder = {
      id: Date.now(),
      text: folderInput,
      isActive: false,
      tasks: [],
    };
    setFolders([...folders, newFolder]);
    setFolderInput("");
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    const newTasks = [
      ...tasks,
      { id: Date.now(), text: taskInput, isActive: false },
    ];
    setTasks(newTasks);
    setTaskInput("");

    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: newTasks } : f
      )
    );
  };

  const handleDeleteFolder = (id) => {
    setFolders(folders.filter((folder) => folder.id !== id));
  };

  const handleDeleteTask = (id) => {
    const newTasks = tasks.filter((t) => t.id !== id);
    setTasks(newTasks);
    setActiveIndex(null);
    setActiveFIndex(null);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: newTasks } : f
      )
    );
  };

  const applyFolderEdit = (id) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === id ? { ...f, text: editFolderText } : f))
    );
    setEditingFolderId(null);
  };

  const applyTaskEdit = (id) => {
    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, text: editTaskText } : t
    );
    setTasks(updatedTasks);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: updatedTasks } : f
      )
    );
    setEditingTaskId(null);
  };

  const clearAllActiveTasks = () => {
    const updatedTasks = tasks.map((t) => ({ ...t, isActive: false }));
    setTasks(updatedTasks);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: updatedTasks } : f
      )
    );
  };

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
        {currentFolder === null && (
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
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
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
                          <div className="flag"></div>
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
                                  applyFolderEdit(folder.id);
                                }
                              }}
                              autoFocus
                              autoCorrect="off"
                              autoCapitalize="off"
                              spellCheck="false"
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
                            onClick={() => {
                              setActiveFIndex(activeFIndex === i ? null : i);
                              setActiveIndex(null);
                            }}
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
                              className="listDelete"
                              onClick={() => handleDeleteFolder(folder.id)}
                            >
                              Delete
                            </button>
                            <button
                              className="listFinished"
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditFolderText(folder.text);
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

        {currentFolder !== null && (
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
              <button onClick={goBack} className="backB">
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
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  <button type="submit">+</button>
                </div>
              </div>
            </form>

            <div id="taskS">
              <ul id="taskListTD">
                <AnimatePresence>
                  <div className="aS flex">
                    <button
                      onClick={clearAllActiveTasks}
                      className="clearActiveBtn"
                    >
                      DeSelect <span style={{ color: "#afd4ed" }}>()</span>
                    </button>
                    <button
                      onClick={deleteAllFinishedTasks}
                      className="deleteActiveBtn"
                    >
                      Delete <span style={{ color: "#afd4ed" }}>()</span>
                    </button>
                  </div>

                  {tasks.map((item, i) => (
                    <motion.li
                      key={item.id}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ duration: 0.25 }}
                    >
                      <div className="listC">
                        <div className="divS">
                          <button
                            className={`finish ${
                              item.isActive ? "active" : ""
                            }`}
                            onClick={() => {
                              const updatedTasks = tasks.map((t) =>
                                t.id === item.id
                                  ? { ...t, isActive: !t.isActive }
                                  : t
                              );
                              setTasks(updatedTasks);
                              setFolders((prev) =>
                                prev.map((f) =>
                                  f.id === currentFolder.id
                                    ? { ...f, tasks: updatedTasks }
                                    : f
                                )
                              );
                            }}
                          ></button>

                          {editingTaskId === item.id ? (
                            <input
                              type="text"
                              value={editTaskText}
                              onChange={(e) => setEditTaskText(e.target.value)}
                              onBlur={() => applyTaskEdit(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  applyTaskEdit(item.id);
                                }
                              }}
                              autoFocus
                              autoCorrect="off"
                              autoCapitalize="off"
                              spellCheck="false"
                            />
                          ) : (
                            <span
                              className={item.isActive ? "activeText" : ""}
                              onClick={() =>
                                setLineActive(lineActive === i ? null : i)
                              }
                            >
                              {item.text}
                            </span>
                          )}
                          <span
                            className={`lineItem ${
                              activeIndex === i ? "active" : ""
                            }`}
                          ></span>
                        </div>

                        <span
                          className={`buttonS ${
                            activeIndex === i ? "active" : ""
                          }`}
                          onClick={() => {
                            setActiveIndex(activeIndex === i ? null : i);
                            setActiveFIndex(null);
                          }}
                        >
                          <button>
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
                              className="listDelete"
                              onClick={() => handleDeleteTask(item.id)}
                            >
                              Delete
                            </button>

                            <button
                              className="listFinished"
                              onClick={() => {
                                setEditingTaskId(item.id);
                                setEditTaskText(item.text);
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
      </AnimatePresence>
    </div>
  );
};

export default TdlF;
