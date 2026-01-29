import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import DashboardPage from "./pages/DashboardPage";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import MenuPage from "./pages/MenuPage";
import { authStorage } from "./lib/auth";

const PrivateRoute = ({ children }: { children: ReactNode }) => {
  if (!authStorage.getToken()) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/menu" element={<PrivateRoute><MenuPage /></PrivateRoute>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
