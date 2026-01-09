import React, { createContext, useContext, useState } from "react";

interface UIContextType {
  // Navigation
  isNavCollapsed: boolean;
  setIsNavCollapsed: (val: boolean) => void;
  toggleNav: () => void;

  // Focus Mode
  focusModeActive: boolean;
  setFocusModeActive: (val: boolean) => void;

  // Command Palette
  showCommandPalette: boolean;
  setShowCommandPalette: (val: boolean) => void;

  // Music Player
  showMusicPlayer: boolean;
  setShowMusicPlayer: (val: boolean) => void;

  // Global Profile Modal
  selectedUserId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;

  // Layout
  isMobile: boolean;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile Check
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 1082px)").matches);
    };
    checkMobile(); // Check on mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const toggleNav = () => setIsNavCollapsed((prev) => !prev);
  
  const openProfile = (userId: string) => {
    setSelectedUserId(userId);
  };

  const closeProfile = () => {
    setSelectedUserId(null);
  };

  const value = {
    isNavCollapsed,
    setIsNavCollapsed,
    toggleNav,
    focusModeActive,
    setFocusModeActive,
    showCommandPalette,
    setShowCommandPalette,
    showMusicPlayer,
    setShowMusicPlayer,
    selectedUserId,
    openProfile,
    closeProfile,
    isMobile,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
