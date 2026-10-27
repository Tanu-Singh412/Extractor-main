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
  onActivateExpiringSoon
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
