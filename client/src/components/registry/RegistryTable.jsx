import React, { useState, useEffect, useMemo } from "react";
import { formatDateString, getStatus } from "../../utils/formatters";

const getDaysRemaining = (doeStr) => {
  if (!doeStr) return null;
  const d = new Date(doeStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function RegistryTable({
  passports = [],
  registryDocType = "ALL",
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  currentPage,
  totalPages,
  onPageChange,
  onResetFilters
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [sortField, setSortField] = useState("expiry");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    const handleClose = () => setOpenMenu(null);
    window.addEventListener("click", handleClose);
    window.addEventListener("scroll", handleClose, true);
    window.addEventListener("resize", handleClose);
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClose);
      window.removeEventListener("scroll", handleClose, true);
      window.removeEventListener("resize", handleClose);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMenuToggle = (e, item) => {
    e.stopPropagation();
    if (openMenu?.id === item.id) {
      setOpenMenu(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const dropdownHeight = 140;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
      setOpenMenu({
        id: item.id,
        item,
        top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
        right: Math.max(12, window.innerWidth - rect.right)
      });
    }
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const cleanDocNumber = (num) => {
    if (!num) return "-";
    // Strip trailing OCR garbage like VALID13/10/2024
    const cleaned = num.replace(/VALID\d{2}\/\d{2}\/\d{4}.*$/i, "").trim();
    return cleaned || num;
  };

  const sortedRecords = useMemo(() => {
    return [...passports].sort((a, b) => {
      let valA = "";
      let valB = "";

      if (sortField === "type") {
        valA = a.docType || "PASSPORT";
        valB = b.docType || "PASSPORT";
      } else if (sortField === "holder") {
        valA = (a.memberName || `${a.firstName || ""} ${a.lastName || ""}`).toLowerCase();
        valB = (b.memberName || `${b.firstName || ""} ${b.lastName || ""}`).toLowerCase();
      } else if (sortField === "number") {
        valA = a.policyNo || a.passportNo || "";
        valB = b.policyNo || b.passportNo || "";
      } else if (sortField === "company") {
        valA = (a.company || "").toLowerCase();
        valB = (b.company || "").toLowerCase();
      } else if (sortField === "expiry") {
        valA = a.doe || a.effectiveDate || "9999-99-99";
        valB = b.doe || b.effectiveDate || "9999-99-99";
      } else if (sortField === "status") {
        valA = getStatus(a).text;
        valB = getStatus(b).text;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [passports, sortField, sortAsc]);

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <i className="fa-solid fa-sort sort-icon"></i>;
    }
    return sortAsc ? (
      <i className="fa-solid fa-sort-up sort-icon" style={{ color: "#4f46e5" }}></i>
    ) : (
      <i className="fa-solid fa-sort-down sort-icon" style={{ color: "#4f46e5" }}></i>
    );
  };

  return (
    <>
      <div className="table-responsive">
        <table className="passport-table">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "21%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "4%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className="sortable" onClick={() => handleSort("type")}>
                Type {renderSortIcon("type")}
              </th>
              <th className="sortable" onClick={() => handleSort("holder")}>
                Holder {renderSortIcon("holder")}
              </th>
              <th className="sortable" onClick={() => handleSort("company")}>
                Company {renderSortIcon("company")}
              </th>
              <th className="sortable" onClick={() => handleSort("number")}>
                {registryDocType === "PASSPORT"
                  ? "Passport No."
                  : registryDocType === "INSURANCE"
                  ? "Policy No."
                  : "Document No."}{" "}
                {renderSortIcon("number")}
              </th>
              <th>
                {registryDocType === "PASSPORT"
                  ? "Nationality"
                  : registryDocType === "INSURANCE"
                  ? "Provider"
                  : "Nationality / Provider"}
              </th>
              <th>Birth Date</th>
              <th className="sortable" onClick={() => handleSort("expiry")}>
                Expiry {renderSortIcon("expiry")}
              </th>
              <th className="sortable" onClick={() => handleSort("status")}>
                Status {renderSortIcon("status")}
              </th>
              <th style={{ textAlign: "center" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state" style={{ padding: "48px 24px" }}>
                    <div className="empty-icon" style={{ margin: "0 auto 16px" }}>
                      <i className="fa-solid fa-filter-circle-xmark"></i>
                    </div>
                    <h4 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                      No matching records found
                    </h4>
                    <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "16px" }}>
                      No documents match your active search or filter criteria.
                    </p>
                    {onResetFilters && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onResetFilters}
                        style={{ fontSize: "12px", padding: "8px 16px" }}
                      >
                        <i className="fa-solid fa-rotate-left"></i> Reset All Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sortedRecords.map((item) => {
                const status = getStatus(item);
                const isInsurance = (item.docType || "PASSPORT") === "INSURANCE";
                const holderName = isInsurance
                  ? item.memberName || `${item.firstName || ""} ${item.lastName || ""}`.trim()
                  : `${item.firstName || item.givenNames || ""} ${item.lastName || item.surname || ""}`.trim();
                const rawDocNumber = isInsurance ? item.policyNo : item.passportNo;
                const docNumber = cleanDocNumber(rawDocNumber);

                return (
                  <tr key={item.id}>
                    <td>
                      <span className={`type-pill ${isInsurance ? "type-insurance" : "type-passport"}`}>
                        <i className={isInsurance ? "fa-solid fa-shield-halved" : "fa-solid fa-passport"}></i>
                        <span>{isInsurance ? "Insurance" : "Passport"}</span>
                      </span>
                    </td>
                    <td>
                      <div className="holder-cell">
                        <div className={`avatar-initials ${isInsurance ? "avatar-insurance" : "avatar-passport"}`}>
                          {getInitials(holderName)}
                        </div>
                        <div className="holder-info">
                          <span className="holder-name">{holderName || "Unnamed"}</span>
                          {item.sex && (
                            <span className="holder-sub">
                              {item.sex === "M" ? "Male" : item.sex === "F" ? "Female" : item.sex}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {item.company ? (
                        <span
                          className="meta-tag"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            background: "#eff6ff",
                            color: "#1d4ed8",
                            border: "1px solid #bfdbfe",
                            borderRadius: "6px",
                            padding: "2px 8px",
                            fontSize: "12px",
                            fontWeight: 500
                          }}
                          title={`Company: ${item.company}`}
                        >
                          <i className="fa-solid fa-building" style={{ fontSize: "11px" }}></i>
                          <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {item.company}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className="doc-num-container" title={rawDocNumber || ""}>
                        <span className="doc-num-text">{docNumber}</span>
                        {rawDocNumber && (
                          <button
                            type="button"
                            className="copy-btn"
                            title={copiedId === item.id ? "Copied!" : "Copy document number"}
                            onClick={() => handleCopy(item.id, rawDocNumber)}
                          >
                            <i className={copiedId === item.id ? "fa-solid fa-check" : "fa-regular fa-copy"}></i>
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      {registryDocType === "PASSPORT" ? (
                        <span className="meta-tag iso-badge" title={item.nationality || item.issuingCountry || ""}>
                          <i className="fa-solid fa-globe" style={{ color: "#6366f1" }}></i>
                          <span>{item.nationality || item.issuingCountry || "-"}</span>
                        </span>
                      ) : registryDocType === "INSURANCE" ? (
                        <span className="meta-tag" title={item.provider || ""}>
                          <i className="fa-solid fa-building-shield" style={{ color: "#0d9488" }}></i>
                          <span>{item.provider || "-"}</span>
                        </span>
                      ) : isInsurance ? (
                        <span className="meta-tag" title={item.provider || ""}>
                          <i className="fa-solid fa-building-shield" style={{ color: "#0d9488" }}></i>
                          <span>{item.provider || "-"}</span>
                        </span>
                      ) : (
                        <span className="meta-tag iso-badge" title={item.nationality || item.issuingCountry || ""}>
                          <i className="fa-solid fa-globe" style={{ color: "#6366f1" }}></i>
                          <span>{item.nationality || item.issuingCountry || "-"}</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: item.dob ? "#334155" : "#94a3b8", fontSize: "12.5px" }}>
                        {item.dob ? formatDateString(item.dob) : "—"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
                        <span style={{ fontWeight: 600, color: "#1e293b", fontSize: "12.5px" }}>
                          {item.doe
                            ? formatDateString(item.doe)
                            : item.effectiveDate
                            ? formatDateString(item.effectiveDate)
                            : "—"}
                        </span>
                        {(() => {
                          const days = getDaysRemaining(item.doe || item.effectiveDate);
                          if (days === null) return null;
                          if (days < 0) {
                            return <span className="days-remaining-badge expired">Expired</span>;
                          }
                          if (days === 0) {
                            return <span className="days-remaining-badge warning">Expires today</span>;
                          }
                          if (days <= 60) {
                            return <span className="days-remaining-badge warning">In {days}d</span>;
                          }
                          if (days <= 180) {
                            return <span className="days-remaining-badge in-window">In {days}d</span>;
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-pill ${
                          status.text === "Valid"
                            ? "status-valid"
                            : status.text === "Expiring Soon"
                            ? "status-warning"
                            : "status-expired"
                        }`}
                      >
                        <i
                          className={
                            status.text === "Valid"
                              ? "fa-solid fa-circle-check"
                              : status.text === "Expiring Soon"
                              ? "fa-solid fa-clock"
                              : "fa-solid fa-circle-exclamation"
                          }
                        ></i>
                        <span>{status.text}</span>
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className={`action-menu-trigger ${openMenu?.id === item.id ? "active" : ""}`}
                        title="Actions menu"
                        aria-label="Actions menu"
                        onClick={(e) => handleMenuToggle(e, item)}
                      >
                        <i className="fa-solid fa-ellipsis-vertical"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        className="pagination"
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          padding: "4px 8px"
        }}
      >
        <div style={{ color: "#64748b", fontSize: "12.5px" }}>
          Showing page <strong>{currentPage}</strong> of <strong>{Math.max(1, totalPages)}</strong>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="btn-pagination"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <i className="fa-solid fa-chevron-left" style={{ marginRight: "4px" }}></i> Prev
          </button>
          <span className="pagination-info" style={{ fontWeight: 600, padding: "0 6px" }}>
            {currentPage} / {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            className="btn-pagination"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next <i className="fa-solid fa-chevron-right" style={{ marginLeft: "4px" }}></i>
          </button>
        </div>
      </div>

      {openMenu && (
        <div
          className="action-dropdown action-dropdown-floating"
          style={{
            top: `${openMenu.top}px`,
            right: `${openMenu.right}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="dropdown-item"
            onClick={() => {
              const item = openMenu.item;
              setOpenMenu(null);
              onViewRecord(item);
            }}
          >
            <i className="fa-solid fa-eye" style={{ color: "#4f46e5", width: "16px" }}></i>
            <span>View Details</span>
          </button>
          <button
            type="button"
            className="dropdown-item"
            onClick={() => {
              const item = openMenu.item;
              setOpenMenu(null);
              onEditRecord(item);
            }}
          >
            <i className="fa-solid fa-pen" style={{ color: "#0d9488", width: "16px" }}></i>
            <span>Edit Record</span>
          </button>
          <div className="dropdown-divider"></div>
          <button
            type="button"
            className="dropdown-item text-danger"
            onClick={() => {
              const item = openMenu.item;
              setOpenMenu(null);
              onDeleteRecord(item);
            }}
          >
            <i className="fa-solid fa-trash" style={{ color: "#e11d48", width: "16px" }}></i>
            <span>Delete Record</span>
          </button>
        </div>
      )}
    </>
  );
}
