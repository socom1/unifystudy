import { BrowserRouter as Router } from "react-router-dom";
import AppLayout from "./layout/AppLayout";

import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { NotificationProvider } from "./context/NotificationContext";
import { GamificationProvider } from "./context/GamificationContext";
import ErrorBoundary from "./components/common/ErrorBoundary";

import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <GamificationProvider>
              <UIProvider>
                <AppLayout />
                <Toaster richColors position="bottom-right" />
              </UIProvider>
            </GamificationProvider>
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
