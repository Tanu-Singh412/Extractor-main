import React from "react";

export default function TopHeader({ activeTab, currentRoute, openMobileSidebar, filterMode,
  handleStatClick, totalCount, validCount, expiringSoonCount, expiredCount,
  registryDocType = "ALL", expiryWindowDays = 60 }) {
  const route = currentRoute || activeTab || "UPLOAD";
  const isUpload = route === "UPLOAD";
  const scope = registryDocType === "PASSPORT" ? "passports" : registryDocType === "INSURANCE" ? "policies" : "documents";
  const stats = [
    { mode: "ALL", label: `Total ${scope}`, value: totalCount, tone: "total" },
    { mode: "VALID", label: "Valid", value: validCount, tone: "valid" },
    { mode: "EXPIRING_SOON", label: `Expiring in ${expiryWindowDays} days`, value: expiringSoonCount, tone: "expiring" },
    { mode: "EXPIRED", label: "Expired", value: expiredCount, tone: "expired" },
  ];
  return (
    <header className="workspace-header">
      <div className="top-header">
        <div className="breadcrumb">
          <button className="mobile-header-toggle" onClick={openMobileSidebar} aria-label="Open navigation" aria-controls="workspace-navigation">
            <i className="fa-solid fa-bars" aria-hidden="true" />
          </button>
          <span>Workspace</span><span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-current">{isUpload ? "New document" : "Registry"}</span>
        </div>
        <span className="workspace-label">Passports & insurance <span className="version-pill" style={{ marginLeft: "8px", opacity: 0.8, fontSize: "11px", fontWeight: 600 }}>v2.1.0</span></span>
      </div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{isUpload ? "DOCUMENT INTAKE" : "YOUR DOCUMENTS"}</p>
          <h1>{isUpload ? "Add a document" : "Document registry"}</h1>
          <p>{isUpload ? "Upload a file, check the details, and save it to your registry." : "Find records, review details, and keep track of expiry dates."}</p>
        </div>
        {isUpload && <div className="workflow-caption"><span>01</span> Upload <span className="workflow-line" /><span>02</span> Review <span className="workflow-line" /><span>03</span> Save</div>}
      </div>
      {!isUpload && (
        <div className="db-stats-filters" aria-label="Filter records by status">
          {stats.map(({ mode, label, value, tone }) => (
            <button key={mode} type="button" className={`stat-card stat-${tone} ${filterMode === mode ? "active" : ""}`}
              onClick={() => handleStatClick(mode)} aria-pressed={filterMode === mode}>
              <span className="stat-lbl"><span className="status-dot" />{label}</span>
              <span className="stat-val">{value}<span className="stat-arrow" aria-hidden="true">↗</span></span>
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

