import React from "react";
import { formatDateString, getFilterLabel, getStatus } from "../../utils/formatters";

export default function SideDrawer({
  isOpen,
  onClose,
  filterMode,
  passports = [],
  onSelectRecord
}) {
  return (
    <>
      <div
        className={`side-drawer-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      ></div>
      <div className={`side-drawer ${isOpen ? "open" : ""}`}>
        <div className="side-drawer-header">
          <h3>
            <i className="fa-solid fa-filter"></i> {getFilterLabel(filterMode)} ({passports.length})
          </h3>
          <button
            type="button"
            className="close-drawer-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div className="side-drawer-content">
          <div className="drawer-list">
            {passports.length === 0 ? (
              <p className="empty-drawer">No records in this category.</p>
            ) : (
              passports.map((item) => {
                const status = getStatus(item);
                const isInsurance = (item.docType || "PASSPORT") === "INSURANCE";
                const holderName = isInsurance
                  ? item.memberName || `${item.firstName || ""} ${item.lastName || ""}`.trim()
                  : `${item.firstName || item.givenNames || ""} ${item.lastName || item.surname || ""}`.trim();
                const docNumber = isInsurance ? item.policyNo : item.passportNo;

                return (
                  <div
                    className="drawer-card"
                    key={item.id}
                    onClick={() => {
                      onSelectRecord(item);
                      onClose();
                    }}
                  >
                    <div className="drawer-card-header">
                      <i className={isInsurance ? "fa-solid fa-id-card-clip" : "fa-solid fa-passport"}></i>{" "}
                      {docNumber || "No number"}
                    </div>
                    <h4>{holderName || "Unnamed Record"}</h4>
                    <p className="drawer-expiry">
                      {item.doe ? `Expiry: ${formatDateString(item.doe)}` : ""}
                    </p>
                    <span className={`badge ${status.cls}`} style={{ marginTop: "8px" }}>
                      {status.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}
