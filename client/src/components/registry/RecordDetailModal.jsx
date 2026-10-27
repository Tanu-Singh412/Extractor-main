import React from "react";
import { formatDateString, getStatus, isPreviewable, isPdfSource } from "../../utils/formatters";
import { getMRZLine1, getMRZLine2 } from "../../utils/mrz";

export default function RecordDetailModal({
  record,
  onClose,
  onEdit,
  onDelete
}) {
  if (!record) return null;

  const isPassportDoc = (record.docType || "PASSPORT") !== "INSURANCE";
  const status = getStatus(record);

  let rows = [];
  if (isPassportDoc) {
    rows = [
      ["Passport Number", record.passportNo],
      ["Issuing Country", record.issuingCountry],
      ["First Name", record.firstName || record.givenNames],
      ["Last Name", record.lastName || record.surname],
      ["Nationality", record.nationality],
      ["Gender", record.sex],
      ["Date of Birth", record.dob ? formatDateString(record.dob) : ""],
      ["Place of Birth", record.placeOfBirth],
      ["Date of Issue", record.issueDate ? formatDateString(record.issueDate) : ""],
      ["Date of Expiry", record.doe ? formatDateString(record.doe) : ""],
      ["Place of Issue", record.placeOfIssue],
      ["Phone", record.phone],
      ["Email", record.email],
      ["Address", record.address],
      ["Old Passport No.", record.oldPassportNo],
      ["File No.", record.fileNo],
      ["Father's Name", record.fatherName],
      ["Mother's Name", record.motherName],
      ["Spouse Name", record.spouseName],
      ["Status", status.text]
    ];
  } else {
    rows = [
      ["Insurance Type", record.insuranceType],
      ["Policy Number", record.policyNo],
      ["Provider", record.provider],
      ["Member Name", record.memberName],
      ["Group No.", record.groupNo],
      ["Date of Birth", record.dob ? formatDateString(record.dob) : ""],
      ["Effective Date", record.effectiveDate ? formatDateString(record.effectiveDate) : ""],
      ["Expiry Date", record.doe ? formatDateString(record.doe) : ""],
      ["Phone", record.phone],
      ["Email", record.email],
      ["Address", record.address],
      ["Status", status.text]
    ];
    if (record.insuranceType === "HEALTH") {
      rows.push(
        ["Health Card No.", record.healthCardNo],
        ["TPA", record.tpa],
        ["Network Hospital", record.networkHospital],
        ["Copay %", record.copayPercentage],
        ["Sum Insured", record.sumInsured],
        ["Room Rent Limit", record.roomRentLimit],
        ["Hosp. Limit", record.hospitalizationLimit],
        ["Waiting Period", record.waitingPeriod],
        ["Pre-Existing Dis.", record.preExistingDisease]
      );
    } else if (record.insuranceType === "MOTOR") {
      rows.push(
        ["Vehicle No.", record.vehicleNo],
        ["Registration No.", record.registrationNo],
        ["Vehicle Type", record.vehicleType],
        ["Make", record.make],
        ["Model", record.model],
        ["Variant", record.variant],
        ["Engine No.", record.engineNo],
        ["Chassis No.", record.chassisNo],
        ["IDV", record.idv],
        ["Year", record.manufacturingYear],
        ["NCB %", record.ncb],
        ["Fuel Type", record.fuelType]
      );
    } else if (record.insuranceType === "LIFE") {
      rows.push(
        ["Life Assured", record.lifeAssured],
        ["Nominee", record.nomineeName],
        ["Maturity Date", record.maturityDate ? formatDateString(record.maturityDate) : ""],
        ["Death Benefit", record.deathBenefit],
        ["Maturity Benefit", record.maturityBenefit],
        ["Premium", record.premium],
        ["Term (Years)", record.policyTermYears]
      );
    } else if (record.insuranceType === "TRAVEL") {
      rows.push(
        ["Start Date", record.travelStartDate ? formatDateString(record.travelStartDate) : ""],
        ["End Date", record.travelEndDate ? formatDateString(record.travelEndDate) : ""],
        ["Destination", record.destination],
        ["Departure", record.departureCountry],
        ["Arrival", record.arrivalCountry],
        ["Trip Type", record.tripType],
        ["Travellers", record.travellerCount]
      );
    }
  }

  const handledKeys = new Set([
    "id", "createdAt", "docType", "previewImage", "passportNo", "issuingCountry",
    "firstName", "givenNames", "lastName", "surname", "nationality", "sex", "dob",
    "placeOfBirth", "issueDate", "doe", "placeOfIssue", "oldPassportNo", "fileNo",
    "address", "fatherName", "motherName", "spouseName", "insuranceType", "policyNo",
    "provider", "memberName", "groupNo", "effectiveDate", "phone", "email",
    "healthCardNo", "tpa", "networkHospital", "copayPercentage", "sumInsured",
    "roomRentLimit", "hospitalizationLimit", "waitingPeriod", "preExistingDisease",
    "vehicleNo", "registrationNo", "vehicleType", "make", "model", "variant",
    "engineNo", "chassisNo", "idv", "manufacturingYear", "ncb", "fuelType",
    "lifeAssured", "nomineeName", "maturityDate", "deathBenefit", "maturityBenefit",
    "premium", "policyTermYears", "travelStartDate", "travelEndDate", "destination",
    "departureCountry", "arrivalCountry", "tripType", "travellerCount"
  ]);

  const extraRows = [];
  Object.keys(record).forEach((key) => {
    if (!handledKeys.has(key) && record[key] && record[key].toString().trim() !== "") {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
      extraRows.push([label, record[key]]);
    }
  });

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        className="modal-content"
        style={{
          background: "var(--bg-main)",
          borderRadius: "12px",
          maxWidth: "800px",
          width: "90%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel" style={{ margin: 0, boxShadow: "none" }}>
          <div
            className="panel-header"
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <div>
              <h2 className="panel-title">
                <i className={isPassportDoc ? "fa-solid fa-passport" : "fa-solid fa-id-card-clip"}></i>{" "}
                {isPassportDoc ? "Passport Details" : "Insurance Card Details"}
              </h2>
              <p className="panel-subtitle">Full record view and extracted information.</p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="fa-solid fa-arrow-left"></i> Back to Registry
            </button>
          </div>

          <div style={{ padding: "24px" }}>
            {isPreviewable(record.previewImage) && (
              isPdfSource(record.previewImage) ? (
                <div
                  style={{
                    marginBottom: "30px",
                    width: "100%",
                    maxWidth: "700px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 14px",
                      background: "var(--bg-card, #ffffff)",
                      borderBottom: "1px solid var(--border)",
                      fontSize: "12px",
                      fontWeight: 600
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <i className="fa-solid fa-file-pdf" style={{ color: "#dc2626" }}></i>
                      Document PDF
                    </span>
                    <a
                      href={record.previewImage.replace(/^__PDF__:[^:]*:::/, "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "11px", color: "var(--accent, #16a34a)", textDecoration: "none" }}
                    >
                      <i className="fa-solid fa-arrow-up-right-from-square"></i> Open in new tab
                    </a>
                  </div>
                  <iframe
                    src={`${record.previewImage.replace(/^__PDF__:[^:]*:::/, "")}#toolbar=0&navpanes=0&view=Fit`}
                    title="Document PDF Preview"
                    style={{ width: "100%", height: "460px", border: "none", display: "block" }}
                  />
                </div>
              ) : (
                <img
                  src={record.previewImage}
                  crossOrigin="use-credentials"
                  alt="Document"
                  className="passport-preview-img"
                  style={{ marginBottom: "30px", maxWidth: "600px", border: "1px solid var(--border)" }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              )
            )}

            <div className="form-row">
              {rows.map(([label, value], idx) => (
                <div
                  className="form-group"
                  style={{ flex: "1 1 30%", minWidth: "220px" }}
                  key={idx}
                >
                  <label>{label}</label>
                  <div
                    className="form-control"
                    style={{
                      background: "var(--bg-main)",
                      border: "1px solid var(--border-light)",
                      padding: "12px",
                      borderRadius: "var(--radius-sm)",
                      color: "var(--text-primary)",
                      fontWeight: 500
                    }}
                  >
                    {value || "-"}
                  </div>
                </div>
              ))}
            </div>

            {extraRows.length > 0 && (
              <div style={{ marginTop: "30px" }}>
                <h4
                  className="section-divider-title"
                  style={{ fontSize: "1rem", marginBottom: "16px" }}
                >
                  <i className="fa-solid fa-plus-circle"></i> Additional Extracted Fields
                </h4>
                <div className="form-row">
                  {extraRows.map(([label, value], idx) => (
                    <div
                      className="form-group"
                      style={{ flex: "1 1 30%", minWidth: "220px" }}
                      key={`extra-${idx}`}
                    >
                      <label>{label}</label>
                      <div
                        className="form-control"
                        style={{
                          background: "var(--bg-main)",
                          border: "1px solid var(--border-light)",
                          padding: "12px",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)",
                          fontWeight: 500
                        }}
                      >
                        {value || "-"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isPassportDoc && (
              <div
                style={{
                  marginTop: "30px",
                  padding: "20px",
                  background: "var(--bg-main)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-light)"
                }}
              >
                <h4
                  style={{
                    marginBottom: "12px",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em"
                  }}
                >
                  <i className="fa-solid fa-barcode"></i> Machine Readable Zone (MRZ)
                </h4>
                <div
                  className="mrz-font"
                  style={{ fontSize: "16px", letterSpacing: "2px", color: "var(--text-primary)" }}
                >
                  {getMRZLine1(record)}
                  <br />
                  {getMRZLine2(record)}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginTop: "32px",
                justifyContent: "flex-start",
                paddingTop: "24px",
                borderTop: "1px solid var(--border)"
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  onEdit(record);
                  onClose();
                }}
              >
                <i className="fa-solid fa-pen"></i> Edit Record
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ borderColor: "var(--rose)", color: "var(--rose)" }}
                onClick={() => {
                  onDelete(record);
                }}
              >
                <i className="fa-solid fa-trash"></i> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
