import { NavLink, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { authStorage } from "../lib/auth";

const Layout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    authStorage.clear();
    navigate("/login");
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="brand">BotPixZap</div>
        <nav className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? "active" : "")}>Resumo</NavLink>
          <NavLink to="/menu" className={({ isActive }) => (isActive ? "active" : "")}>Cardápio</NavLink>
        </nav>
        <button className="logout" onClick={handleLogout} type="button">
          Sair
        </button>
      </header>
      <main className="content">{children}</main>
    </div>
  );
};

export default Layout;
