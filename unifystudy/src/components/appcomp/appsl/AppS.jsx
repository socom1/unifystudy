import React from "react";
import TdlOVERALL from "./tdl/TdlOVERALL";
import Pomodoro from "./pomodoro/Pomdoro";
import MyTimetable from "./myTimetable/MyTimetable";

const AppS = ({ activeComponent }) => {
  const renderComponent = () => {
    switch (activeComponent) {
      case "todo":
        return <TdlOVERALL />;
      case "pomodoro":
        return <Pomodoro />;
      case "timetable":
        return <MyTimetable />;
      default:
        return <div>Select a section from the menu</div>;
    }
  };

  return <div className="containerAppS">{renderComponent()}</div>;
};

export default AppS;
