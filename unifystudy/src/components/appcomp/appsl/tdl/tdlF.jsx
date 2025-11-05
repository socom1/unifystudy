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
  const [activeIndex, setActiveIndex] = useState(null);
  const [activeFIndex, setActiveFIndex] = useState(null);
  const [lineActive, setLineActive] = useState(null);

  // Rename states
  const [renameIndex, setRenameIndex] = useState(null);
  const [renameText, setRenameText] = useState("");

  useEffect(() => {
    localStorage.setItem("folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (activeIndex !== null && activeIndex >= tasks.length) {
      setActiveIndex(null);
      setActiveFIndex(null);
    }
  }, [tasks, activeIndex]);

  const enterFolder = (folder) => {
    setCurrentFolder(folder);
    setTasks(folder.tasks || []);
  };

  const goBack = () => {
    setCurrentFolder(null);
    setTasks([]);
    setActiveIndex(null);
    setActiveFIndex(null);
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

    const newTasks = [...tasks, { text: taskInput, isActive: false }];
    setTasks(newTasks);
    setTaskInput("");

    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: newTasks } : f
      )
    );
  };

  const handleDeleteFolder = (index) => {
    setFolders(folders.filter((_, i) => i !== index));
  };

  const handleDeleteTask = (index) => {
    const newTasks = tasks.filter((_, i) => i !== index);
    setTasks(newTasks);
    setActiveIndex(null);
    setActiveFIndex(null);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: newTasks } : f
      )
    );
  };

  // ---------------- Rename Functions ----------------
  const handleRenameFolder = (index) => {
    setRenameIndex(index);
    setRenameText(folders[index].text);
  };

  const saveRenameFolder = (index) => {
    if (!renameText.trim()) return;
    const updatedFolders = folders.map((f, i) =>
      i === index ? { ...f, text: renameText } : f
    );
    setFolders(updatedFolders);
    setRenameIndex(null);
    setRenameText("");
  };

  const handleRenameTask = (index) => {
    setRenameIndex(index);
    setRenameText(tasks[index].text);
  };

  const saveRenameTask = (index) => {
    if (!renameText.trim()) return;
    const updatedTasks = tasks.map((t, i) =>
      i === index ? { ...t, text: renameText } : t
    );
    setTasks(updatedTasks);
    setFolders((prev) =>
      prev.map((f) =>
        f.id === currentFolder.id ? { ...f, tasks: updatedTasks } : f
      )
    );
    setRenameIndex(null);
    setRenameText("");
  };
  // ---------------------------------------------------

  const pageVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  // Animation for rename transitions
  const renameVariants = {
    hidden: { opacity: 0, y: -5, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 5, scale: 0.98 },
  };

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        {/* ------------------------ */}
        {/* Folder List View */}
        {/* ------------------------ */}
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
                  />
                  <button type="submit">+</button>
                </div>
              </div>
            </form>
            <div id="taskS">
              <ul id="taskListTD">
                {folders.map((folder, i) => (
                  <li key={folder.id}>
                    <div className="listC">
                      <div className="divS">
                        <AnimatePresence mode="wait">
                          {renameIndex === i ? (
                            <motion.input
                              key="input"
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onBlur={() => saveRenameFolder(i)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveRenameFolder(i)
                              }
                              autoFocus
                              variants={renameVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                            />
                          ) : (
                            <motion.span
                              key="span"
                              onClick={() => enterFolder(folder)}
                              variants={renameVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                              {folder.text}
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </div>

                      <span
                        className={`buttonS ${
                          activeFIndex === i ? "active" : ""
                        }`}
                      >
                        <button
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
                            className="listDelete"
                            onClick={() => handleDeleteFolder(i)}
                          >
                            Delete
                          </button>
                          <button
                            className="listFinished"
                            onClick={() => handleRenameFolder(i)}
                          >
                            Edit Name
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}

        {/* ------------------------ */}
        {/* Task View */}
        {/* ------------------------ */}
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
                  />
                  <button type="submit">+</button>
                </div>
              </div>
            </form>
            <div id="taskS">
              <ul id="taskListTD">
                {tasks.map((item, i) => (
                  <li key={i}>
                    <div className="listC">
                      <div className="divS">
                        <AnimatePresence mode="wait">
                          {renameIndex === i ? (
                            <motion.input
                              key="input"
                              type="text"
                              value={renameText}
                              onChange={(e) => setRenameText(e.target.value)}
                              onBlur={() => saveRenameTask(i)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && saveRenameTask(i)
                              }
                              autoFocus
                              variants={renameVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              transition={{
                                duration: 0.2,
                                ease: "easeInOut",
                              }}
                            />
                          ) : (
                            <motion.span
                              key="span"
                              onClick={() =>
                                setLineActive(lineActive === i ? null : i)
                              }
                              variants={renameVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              transition={{
                                duration: 0.2,
                                ease: "easeInOut",
                              }}
                            >
                              {item.text}
                            </motion.span>
                          )}
                        </AnimatePresence>
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
                        onClick={() =>
                          setActiveIndex(activeIndex === i ? null : i)
                        }
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
                            onClick={() => handleDeleteTask(i)}
                          >
                            Delete
                          </button>
                          <button
                            className="listFinished"
                            onClick={() => handleRenameTask(i)}
                          >
                            Edit Name
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TdlF;
