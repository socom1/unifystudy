import React from "react";
import "./PageLoader.scss";

interface PageLoaderProps {
  message?: string;
}

const PageLoader: React.FC<PageLoaderProps> = ({ message = "Loading..." }) => {
  return (
    <div className="page-loader-container">
      <div className="loader"></div>
      <p className="loader-text">{message}</p>
    </div>
  );
};

export default PageLoader;
