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
  onLogout,
  companyFilter = "ALL",
  setCompanyFilter,
  companies = [],
  companyCounts = {},
  registryDocType = "ALL",
  setRegistryDocType,
  docTypeCounts = { passport: 0, insurance: 0 }
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
            className={`nav-btn nav-filter-btn ${filterMode === "ALL" && (!companyFilter || companyFilter === "ALL") && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => {
              handleFilterClick("ALL");
              if (setCompanyFilter) setCompanyFilter("ALL");
            }}
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

          {/* Categories */}
          {/* <div className="nav-section-label" style={{ marginTop: "14px" }}>
            Categories
          </div>
          <button
            className={`nav-btn nav-filter-btn ${registryDocType === "PASSPORT" && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => {
              if (setRegistryDocType) setRegistryDocType(registryDocType === "PASSPORT" ? "ALL" : "PASSPORT");
              navigate("REGISTRY");
              closeMobileSidebar();
              setIsSidebarOpen(false);
            }}
          >
            <i className="fa-solid fa-passport" style={{ color: "var(--accent)" }}></i>
            <span style={{ flex: 1 }}>Passports</span>
            <span className="sidebar-count-pill pill-neutral">{docTypeCounts.passport || 0}</span>
          </button>
          <button
            className={`nav-btn nav-filter-btn ${registryDocType === "INSURANCE" && route === "REGISTRY" ? "active" : ""}`}
            onClick={() => {
              if (setRegistryDocType) setRegistryDocType(registryDocType === "INSURANCE" ? "ALL" : "INSURANCE");
              navigate("REGISTRY");
              closeMobileSidebar();
              setIsSidebarOpen(false);
            }}
          >
            <i className="fa-solid fa-shield-halved" style={{ color: "var(--emerald)" }}></i>
            <span style={{ flex: 1 }}>Insurance</span>
            <span className="sidebar-count-pill pill-neutral">{docTypeCounts.insurance || 0}</span>
          </button> */}

          {/* Group / Company dropdown */}
          {companies && companies.length > 0 && (
            <div style={{ marginTop: "12px", padding: "0 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span className="nav-section-label" style={{ padding: 0, fontSize: "10px" }}>Group / Company</span>
                {companyFilter && companyFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setCompanyFilter?.("ALL")}
                    style={{ fontSize: "10px", color: "var(--accent)", fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                className="form-control"
                value={companyFilter || "ALL"}
                onChange={(e) => {
                  if (setCompanyFilter) setCompanyFilter(e.target.value);
                  navigate("REGISTRY");
                  closeMobileSidebar();
                  setIsSidebarOpen(false);
                }}
                style={{
                  width: "100%",
                  height: "32px",
                  fontSize: "12px",
                  borderRadius: "var(--radius-xs, 5px)",
                  background: companyFilter && companyFilter !== "ALL" ? "var(--emerald-bg, #eef5ef)" : "#fff",
                  borderColor: companyFilter && companyFilter !== "ALL" ? "var(--accent)" : "var(--border)",
                  color: "var(--text-primary)"
                }}
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name} {companyCounts?.[c.name] ? `(${companyCounts[c.name]})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
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
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
