import React, { createContext, useContext, useState, useEffect } from "react";

interface UIContextType {
  isNavCollapsed: boolean;
  toggleNav: () => void;
  setNavCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
  focusModeActive: boolean;
  toggleFocusMode: (e?: React.MouseEvent | React.TouchEvent) => void;
  setFocusModeActive: (active: boolean) => void;
  showCommandPalette: boolean;
  setShowCommandPalette: (show: boolean) => void;
  toggleCommandPalette: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleNav = () => setIsNavCollapsed(prev => !prev);

  const toggleFocusMode = (e?: React.MouseEvent | React.TouchEvent) => {
    if(e && e.stopPropagation) e.stopPropagation();
    setFocusModeActive(prev => !prev);
  };
  
  const toggleCommandPalette = () => setShowCommandPalette(prev => !prev);

  return (
    <UIContext.Provider value={{
      isNavCollapsed,
      toggleNav,
      setNavCollapsed: setIsNavCollapsed,
      isMobile,
      focusModeActive,
      toggleFocusMode,
      setFocusModeActive,
      showCommandPalette,
      setShowCommandPalette,
      toggleCommandPalette
    }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};
