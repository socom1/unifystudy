import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./pomodoro.scss";

const Pomodoro = () => {
  const [timeLeft, setTimeLeft] = useState(10 * 60);
  const [selectedDuration, setSelectedDuration] = useState(10 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [fadeKey, setFadeKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [customDurations, setCustomDurations] = useState([]);
  const [newDuration, setNewDuration] = useState("");
  const [activeButton, setActiveButton] = useState("");

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  useEffect(() => {
    let id;
    if (isRunning) {
      id = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(id);
            setIsRunning(false);
            setActiveButton("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setIntervalId(id);
    }
    return () => clearInterval(id);
  }, [isRunning]);

  const handleStart = () => {
    if (!isRunning && timeLeft > 0) {
      setIsRunning(true);
      setActiveButton("start");
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    clearInterval(intervalId);
    setActiveButton("stop");
  };

  const handleReset = () => {
    setIsRunning(false);
    clearInterval(intervalId);
    setTimeLeft(selectedDuration);
    setFadeKey((k) => k + 1);
    setActiveButton("");
  };

  const handleSetTime = (minutes) => {
    const newDuration = minutes * 60;
    setIsRunning(false);
    clearInterval(intervalId);
    setSelectedDuration(newDuration);
    setTimeLeft(newDuration);
    setFadeKey((k) => k + 1);
    setActiveButton("");
  };

  const toggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  const handleAddDuration = (e) => {
    e.preventDefault();
    const val = parseInt(newDuration);
    if (!val || val <= 0) return;
    if (!customDurations.includes(val)) {
      const updated = [...customDurations, val].sort((a, b) => a - b);
      setCustomDurations(updated);
    }
    setNewDuration("");
  };

  const handleRemoveDuration = (min) => {
    setCustomDurations(customDurations.filter((d) => d !== min));
  };

  const allDurations = [5, 10, 20, 25, 60, ...customDurations].sort(
    (a, b) => a - b
  );

  return (
    <>
      <div className="flexcontainer flex">
        <div id="duration">
          <div className="flexcontainer flex">
            <ol id="left1">
              <AnimatePresence>
                {allDurations.map((min) => (
                  <motion.li
                    key={min}
                    className={`${min}min ${isEditing ? "deact" : ""}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                    layout
                  >
                    <motion.button
                      className={isEditing ? "deact" : ""}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleSetTime(min)}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {min}
                    </motion.button>

                    <div
                      className={`xS ${isEditing ? "active" : ""}`}
                      onClick={() => handleRemoveDuration(min)}
                    >
                      <span className="l1"></span>
                      <span className="l2"></span>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>

            <div className="right">
              <AnimatePresence mode="wait">
                <motion.button
                  key={isEditing ? "close" : "edit"}
                  id="addB"
                  onClick={toggleEdit}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className={isEditing ? "active" : ""}
                >
                  {isEditing ? "close" : "edit"}
                  <span style={{ color: "#afd4ed" }}>()</span>
                </motion.button>
              </AnimatePresence>
            </div>
          </div>

          <form
            id="amountForm"
            onSubmit={handleAddDuration}
            className={`addAmount ${isEditing ? "active" : ""}`}
          >
            <input
              id="enam"
              placeholder="Add new time (minutes)"
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              className={isEditing ? "active" : ""}
            />
            <button type="submit">+</button>
          </form>
        </div>
      </div>

      <div id="app">
        <div className="flexcontainer flex">
          <h1>Coding Session</h1>
          <div className="timer flex">
            <AnimatePresence mode="wait">
              <motion.p
                key={fadeKey}
                id="time"
                initial={{ opacity: 0, scale: 0.8, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 5 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                {formatTime(timeLeft)}
              </motion.p>
            </AnimatePresence>

            <ul className="bL flex">
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleReset}
              >
                reset
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleStart}
                animate={{
                  backgroundColor: activeButton === "start" ? "#4b6c82" : "",
                }}
                transition={{ duration: 0.2 }}
              >
                start
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={handleStop}
                animate={{
                  backgroundColor: activeButton === "stop" ? "#ac4646" : "",
                }}
                transition={{ duration: 0.2 }}
              >
                stop
              </motion.button>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pomodoro;
