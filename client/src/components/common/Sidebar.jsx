import React, { useState, useEffect, useRef } from "react";
import Brand from "./Brand";
import ProfileDropdown from "./ProfileDropdown";
import ChangePasswordModal from "./ChangePasswordModal";

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentRoute,
  onNavigate,
  filterMode,
  setFilterMode,
  setIsSidebarOpen,
  mobileSidebarOpen,
  closeMobileSidebar,
  totalCount,
  validCount,
  expiringSoonCount,
  expiredCount,
  currentUser,
  onLogout
}) {
  const route = currentRoute || activeTab || "UPLOAD";
  const navigate = onNavigate || setActiveTab;
  const sidebarRef = useRef(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  useEffect(() => {

    if (!mobileSidebarOpen) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const buttons = sidebarRef.current?.querySelectorAll("button");
    buttons?.[0]?.focus();
    const handleKey = (event) => {
      if (event.key === "Escape") closeMobileSidebar();
      if (event.key !== "Tab" || !buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [mobileSidebarOpen, closeMobileSidebar]);

  const handleNavClick = (tab) => {
    navigate(tab);
    closeMobileSidebar();
  };

  const handleFilterClick = (mode) => {
    setFilterMode(mode);
    navigate("REGISTRY");
    closeMobileSidebar();
    setIsSidebarOpen(false);
  };

  return (
    <>
      <div
        className={`mobile-sidebar-overlay ${mobileSidebarOpen ? "active" : ""}`}
        onClick={closeMobileSidebar}
      ></div>
      <aside ref={sidebarRef} id="workspace-navigation" aria-label="Workspace navigation" className={`sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <Brand />
          <button className="mobile-nav-close" onClick={closeMobileSidebar} aria-label="Close navigation">×</button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Workspace</div>
          <button
            className={`nav-btn ${route === "UPLOAD" ? "active" : ""}`}
            onClick={() => handleNavClick("UPLOAD")}
            aria-current={route === "UPLOAD" ? "page" : undefined}
            title="New document"
          >
            <i className="fa-solid fa-cloud-arrow-up"></i>
            <span>New document</span>
          </button>
          <button
            className={`nav-btn ${route === "REGISTRY" ? "active" : ""}`}
            onClick={() => handleNavClick("REGISTRY")}
            aria-current={route === "REGISTRY" ? "page" : undefined}
            title="Document registry"
          >
            <i className="fa-solid fa-database"></i>
            <span>Document registry</span>
          </button>

          <div className="nav-section-label" style={{ marginTop: "14px" }}>
            Record status
          </div>
          <button
            className={`nav-btn nav-filter-btn ${filterMode === "ALL" && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => handleFilterClick("ALL")}
          >
            <i className="fa-solid fa-layer-group"></i>
            <span style={{ flex: 1 }}>All Records</span>
            <span className="sidebar-count-pill pill-neutral">{totalCount}</span>
          </button>
          <button
            className={`nav-btn nav-filter-btn ${filterMode === "VALID" && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => handleFilterClick("VALID")}
          >
            <i className="fa-solid fa-circle-check" style={{ color: "var(--emerald)" }}></i>
            <span style={{ flex: 1 }}>Valid</span>
            <span className="sidebar-count-pill pill-valid">{validCount}</span>
          </button>
          <button
            className={`nav-btn nav-filter-btn ${filterMode === "EXPIRING_SOON" && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => handleFilterClick("EXPIRING_SOON")}
          >
            <i className="fa-solid fa-clock" style={{ color: "var(--amber)" }}></i>
            <span style={{ flex: 1 }}>Expiring Soon</span>
            <span className="sidebar-count-pill pill-warning">{expiringSoonCount}</span>
          </button>
          <button
            className={`nav-btn nav-filter-btn ${filterMode === "EXPIRED" && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => handleFilterClick("EXPIRED")}
          >
            <i className="fa-solid fa-circle-exclamation" style={{ color: "var(--rose)" }}></i>
            <span style={{ flex: 1 }}>Expired</span>
            <span className="sidebar-count-pill pill-expired">{expiredCount}</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          {currentUser && (
            <ProfileDropdown
              currentUser={currentUser}
              onLogout={onLogout}
              onChangePasswordClick={() => setIsPasswordModalOpen(true)}
              showSignOut={false}
            />
          )}
          <button
            className="sidebar-logout-btn"
            onClick={onLogout}
            title="Sign out of session"
          >
            <i className="fa-solid fa-arrow-right-from-bracket"></i>
            <span>Sign out</span>
          </button>
          <div className="sidebar-version-tag">v2.1.0</div>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
