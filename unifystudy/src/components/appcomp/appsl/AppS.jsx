import React from "react";
import TdlOVERALL from "./tdl/TdlOVERALL";
import Pomodoro from "./pomodoro/Pomdoro";

const AppS = ({ activeComponent }) => {
  const renderComponent = () => {
    switch (activeComponent) {
      case "todo":
        return <TdlOVERALL />;
      case "pomodoro":
        return <Pomodoro />;
      default:
        return <div>Select a section from the menu</div>;
    }
  };

  return <div className="containerAppS">{renderComponent()}</div>;
};

export default AppS;
