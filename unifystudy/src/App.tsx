import { BrowserRouter as Router } from "react-router-dom";
import AppLayout from "./layout/AppLayout";

import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";

function App() {
  return (
    <Router>
      <AuthProvider>
        <UIProvider>
          <AppLayout />
        </UIProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
