import React, { useRef, useEffect } from "react";

export default function RegistryToolbar({
  searchQuery,
  setSearchQuery,
  registryDocType,
  setRegistryDocType,
  docTypeCounts = { all: 0, passport: 0, insurance: 0 },
  filterMode = "ALL",
  onClearFilterMode,
  onResetAllFilters,
  expiryWindowDays = 60,
  setExpiryWindowDays,
  onActivateExpiringSoon,
  companies = [],
  companyFilter = "ALL",
  setCompanyFilter
}) {
  const searchInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (searchInputRef.current?.getClientRects().length) searchInputRef.current.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const hasActiveFilters =
    registryDocType !== "ALL" ||
    filterMode !== "ALL" ||
    companyFilter !== "ALL" ||
    Boolean(searchQuery && searchQuery.trim());

  const getStatusLabel = (mode) => {
    switch (mode) {
      case "VALID": return "Valid Documents";
      case "EXPIRING_SOON": return `Expiring in ${expiryWindowDays} Days`;
      case "EXPIRED": return "Expired Documents";
      default: return null;
    }
  };

  const statusLabel = getStatusLabel(filterMode);

  return (
    <div className="db-toolbar" style={{ display: "flex", flexDirection: "column", gap: "14px", alignItems: "stretch" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div className="search-wrapper" style={{ flex: 1, minWidth: "260px", position: "relative" }}>
          <i className="fa-solid fa-magnifying-glass search-leading-icon"></i>
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Search name, document number or nationality…"
            aria-label="Search records"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="search-clear-btn"
              title="Clear search"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          ) : (
            <span className="search-shortcut-badge">
              <kbd>Ctrl</kbd> <kbd>K</kbd>
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="filter-pills-group">
            <button
              type="button"
              className={`filter-pill ${registryDocType === "ALL" ? "active" : ""}`}
              onClick={() => setRegistryDocType("ALL")}
            >
              <i className="fa-solid fa-layer-group"></i>
              <span>All</span>
              <span className="pill-count">{docTypeCounts.all}</span>
            </button>
            <button
              type="button"
              className={`filter-pill ${registryDocType === "PASSPORT" ? "active" : ""}`}
              onClick={() => setRegistryDocType("PASSPORT")}
            >
              <i className="fa-solid fa-passport"></i>
              <span>Passports</span>
              <span className="pill-count">{docTypeCounts.passport}</span>
            </button>
            <button
              type="button"
              className={`filter-pill ${registryDocType === "INSURANCE" ? "active" : ""}`}
              onClick={() => setRegistryDocType("INSURANCE")}
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>Insurance</span>
              <span className="pill-count">{docTypeCounts.insurance}</span>
            </button>
          </div>

          <div
            className={`expiry-filter-wrapper ${filterMode === "EXPIRING_SOON" ? "active" : ""}`}
            title={`Select expiry timeframe (currently ${expiryWindowDays} days)`}
          >
            <span className="expiry-filter-label">
              <i className="fa-solid fa-hourglass-half expiry-filter-icon"></i>
              <span>Expiring:</span>
            </span>
            <div className="expiry-select-box">
              <select
                className="expiry-select"
                value={expiryWindowDays}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  setExpiryWindowDays(days);
                  if (onActivateExpiringSoon) {
                    onActivateExpiringSoon();
                  }
                }}
                aria-label="Filter documents expiring in selected timeframe"
              >
                <option value={30}>Next 30 Days</option>
                <option value={60}>Next 60 Days</option>
                <option value={90}>Next 90 Days</option>
                <option value={180}>Next 180 Days (6 Mo)</option>
                <option value={365}>Next 1 Year</option>
              </select>
              <i className="fa-solid fa-chevron-down expiry-select-caret"></i>
            </div>
          </div>

          {/* Company Filter */}
          <div
            className={`company-filter-wrapper ${companyFilter !== "ALL" ? "active" : ""}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              background: companyFilter !== "ALL" ? "#e0e7ff" : "#ffffff",
              border: companyFilter !== "ALL" ? "1px solid #6366f1" : "1px solid #cbd5e1",
              borderRadius: "8px",
              fontSize: "13px",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
            }}
            title="Filter documents by company"
          >
            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: companyFilter !== "ALL" ? "#4338ca" : "#64748b", fontWeight: 600 }}>
              <i className="fa-solid fa-building"></i>
              <span>Company:</span>
            </span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontWeight: companyFilter !== "ALL" ? 600 : 500,
                  color: companyFilter !== "ALL" ? "#312e81" : "#1e293b",
                  cursor: "pointer",
                  fontSize: "13px",
                  paddingRight: "14px"
                }}
                aria-label="Filter documents by company"
              >
                <option value="ALL">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
                <option value="UNASSIGNED">Unassigned / None</option>
              </select>
            </div>
            {companyFilter !== "ALL" && (
              <button
                type="button"
                onClick={() => setCompanyFilter("ALL")}
                title="Clear company filter"
                style={{
                  background: "none",
                  border: "none",
                  color: "#6366f1",
                  cursor: "pointer",
                  padding: "0 2px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="active-filters-bar">
          <span className="active-filters-label">
            <i className="fa-solid fa-filter"></i> Active Filters:
          </span>

          {registryDocType !== "ALL" && (
            <span className="filter-chip">
              <span>Type: <strong>{registryDocType === "PASSPORT" ? "Passports" : "Insurance"}</strong></span>
              <i
                className="fa-solid fa-xmark chip-remove"
                onClick={() => setRegistryDocType("ALL")}
                title="Remove type filter"
              ></i>
            </span>
          )}

          {companyFilter !== "ALL" && (
            <span className="filter-chip">
              <span>Company: <strong>{companyFilter === "UNASSIGNED" ? "Unassigned" : companyFilter}</strong></span>
              <i
                className="fa-solid fa-xmark chip-remove"
                onClick={() => setCompanyFilter("ALL")}
                title="Remove company filter"
              ></i>
            </span>
          )}

          {statusLabel && (
            <span className="filter-chip">
              <span>Status: <strong>{statusLabel}</strong></span>
              <i
                className="fa-solid fa-xmark chip-remove"
                onClick={onClearFilterMode}
                title="Remove status filter"
              ></i>
            </span>
          )}

          {searchQuery && (
            <span className="filter-chip">
              <span>Search: <strong>"{searchQuery}"</strong></span>
              <i
                className="fa-solid fa-xmark chip-remove"
                onClick={() => setSearchQuery("")}
                title="Clear search query"
              ></i>
            </span>
          )}

          <button
            type="button"
            className="clear-all-btn"
            onClick={onResetAllFilters}
          >
            <i className="fa-solid fa-rotate-left"></i> Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}
