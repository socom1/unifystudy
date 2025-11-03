import React, { useState } from "react";
import "../tdl/tdlF.css";
const TdlF = () => {
  const [isActive, setIsActive] = React.useState(false);
  const [text, setText] = useState("");
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem("tasks");
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  React.useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setTasks([...tasks, text]);
    console.log("new task:", text);
    setText("");
  };

  return (
    <div>
      <div className="containerflex flex">
        <div id="submitI" className="flex">
          <div className="flexC flex">
            <form id="taskForm" onSubmit={handleSubmit}>
              <input
                type="text"
                id="submitIN"
                placeholder="Add New Task"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button type="submit" className="submitB">
                +
              </button>
            </form>
          </div>
        </div>
      </div>
      <div className="appL">
        <div id="taskS">
          <ul id="taskListTD">
            {tasks.map((item, i) => (
              <li key={i}>
                <div className="listC">
                  <div className="divS">
                    <span>{item}</span>
                  </div>
                  <span
                    className="buttonS"
                    onClick={() => setIsActive(!isActive)}
                  >
                    <button>
                      <span className="span1"></span>
                      <span className="span2"></span>
                    </button>
                  </span>
                  <div className={`lOption ${isActive ? "active" : ""}`}>
                    <div className="flexcL">
                      <button className="listDelete">Delete</button>
                      <button className="listFinished">Edit Name</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TdlF;
