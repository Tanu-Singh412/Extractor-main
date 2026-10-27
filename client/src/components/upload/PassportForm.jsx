import React, { useState } from "react";

export default function PassportForm({
  formState,
  handleInputChange,
  formErrors = {},
  companies = [],
  onAddCompany,
  onEditCompany,
  onDeleteCompany
}) {
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);

  const handleCreateCompany = async () => {
    const trimmed = (newCompanyName || "").trim();
    if (!trimmed || !onAddCompany) return;
    setIsSubmittingCompany(true);
    try {
      const created = await onAddCompany(trimmed);
      setNewCompanyName("");
      setIsAddingCompany(false);
      if (created?.name) {
        handleInputChange({ target: { name: "company", value: created.name } });
      }
    } catch {
      // Handled in hook
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const startEditCompany = () => {
    if (!formState.company) return;
    setEditCompanyName(formState.company);
    setIsEditingCompany(true);
    setIsAddingCompany(false);
  };

  const handleUpdateCompany = async () => {
    const trimmed = (editCompanyName || "").trim();
    if (!trimmed || !onEditCompany || !formState.company) return;
    const currentComp = companies.find(c => c.name.toLowerCase() === formState.company.toLowerCase());
    const targetId = currentComp?.id || formState.company;
    setIsSubmittingCompany(true);
    try {
      const updated = await onEditCompany(targetId, trimmed);
      setIsEditingCompany(false);
      if (updated?.name) {
        handleInputChange({ target: { name: "company", value: updated.name } });
      }
    } catch {
      // Handled in hook
    } finally {
      setIsSubmittingCompany(false);
    }
  };

  const handleDeleteCompany = async (companyIdOrName) => {
    if (!onDeleteCompany) return;
    try {
      await onDeleteCompany(companyIdOrName);
      const currentSelected = companies.find(c => (c.id === companyIdOrName || c.name === companyIdOrName));
      if (formState.company && currentSelected && formState.company === currentSelected.name) {
        handleInputChange({ target: { name: "company", value: "" } });
      }
    } catch {
      // Handled in hook
    }
  };

  const [showOptional, setShowOptional] = useState(() => {
    const optionalVals = [
      formState.fatherName,
      formState.motherName,
      formState.spouseName,
      formState.oldPassportNo,
      formState.fileNo
    ];
    return optionalVals.some(v => v && v.trim());
  });

  const optionalCore = [
    ["placeOfIssue", "Place of Issue", "fa-location-dot", "e.g. New Delhi (optional)"],
    ["placeOfBirth", "Place of Birth", "fa-map-pin", "Place of birth (optional)"]
  ];

  const contactFields = [
    ["phone", "Phone Number", "fa-phone", "Contact phone number"],
    ["email", "Email Address", "fa-envelope", "Contact email"],
    ["address", "Address", "fa-house", "Full residential address"]
  ];

  const collapsibleFields = [
    ["fatherName", "Father's Name", "fa-user-tie", "Father's full name"],
    ["motherName", "Mother's Name", "fa-user", "Mother's full name"],
    ["spouseName", "Spouse's Name", "fa-user-group", "Spouse's full name (if applicable)"],
    ["oldPassportNo", "Old Passport No.", "fa-id-card", "Old passport number"],
    ["fileNo", "File No.", "fa-file", "File number"]
  ];

  return (
    <div className="form-sections-container">
      {/* Section 1: Document Identification */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-id-card"></i>
          </div>
          <div className="section-header-text">
            <h4>Document Credentials</h4>
            <p>Official passport numbering and issuance authority</p>
          </div>
          <span className="section-req-badge">Required</span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="passport-passportNo">
              Passport Number <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.passportNo ? "has-error" : ""}`}>
              <i className="fa-solid fa-id-card"></i>
              <input
                type="text"
                id="passport-passportNo"
                name="passportNo"
                className={`form-control ${formErrors.passportNo ? "is-invalid" : ""}`}
                placeholder="e.g. A12345678"
                value={formState.passportNo || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.passportNo && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.passportNo}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-issuingCountry">
              Issuing Country Code <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.issuingCountry ? "has-error" : ""}`}>
              <i className="fa-solid fa-map-location-dot"></i>
              <input
                type="text"
                id="passport-issuingCountry"
                name="issuingCountry"
                className={`form-control ${formErrors.issuingCountry ? "is-invalid" : ""}`}
                placeholder="e.g. IND (3 letters)"
                value={formState.issuingCountry || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
                maxLength={3}
              />
            </div>
            {formErrors.issuingCountry && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.issuingCountry}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-nationality">
              Nationality <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.nationality ? "has-error" : ""}`}>
              <i className="fa-solid fa-globe"></i>
              <input
                type="text"
                id="passport-nationality"
                name="nationality"
                className={`form-control ${formErrors.nationality ? "is-invalid" : ""}`}
                placeholder="e.g. IND or INDIAN"
                value={formState.nationality || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.nationality && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.nationality}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-issueDate">
              Date of Issue <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.issueDate ? "has-error" : ""}`}>
              <i className="fa-solid fa-calendar"></i>
              <input
                type="date"
                id="passport-issueDate"
                name="issueDate"
                className={`form-control ${formErrors.issueDate ? "is-invalid" : ""}`}
                value={formState.issueDate || ""}
                onChange={handleInputChange}
                required
              />
            </div>
            {formErrors.issueDate && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.issueDate}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-doe">
              Date of Expiry <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.doe ? "has-error" : ""}`}>
              <i className="fa-solid fa-calendar-check"></i>
              <input
                type="date"
                id="passport-doe"
                name="doe"
                className={`form-control ${formErrors.doe ? "is-invalid" : ""}`}
                value={formState.doe || ""}
                onChange={handleInputChange}
                required
              />
            </div>
            {formErrors.doe && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.doe}
              </span>
            )}
          </div>

          {/* Company Field (fitted beside Date of Expiry, with Edit and Add New options) */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label htmlFor="passport-company" style={{ margin: 0, fontWeight: 600 }}>
                Company <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>(Optional)</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {formState.company && !isEditingCompany && !isAddingCompany && (
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={startEditCompany}
                    title={`Edit name of "${formState.company}"`}
                    style={{
                      fontSize: "12px",
                      color: "var(--accent, #315e48)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 4px",
                      fontWeight: 600,
                      borderRadius: "var(--radius-xs, 4px)"
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                    Edit
                  </button>
                )}
                {formState.company && !isEditingCompany && !isAddingCompany && (
                  <button
                    type="button"
                    className="btn-text-action"
                    onClick={() => {
                      if (window.confirm(`Delete company "${formState.company}" from options?`)) {
                        handleDeleteCompany(formState.company);
                      }
                    }}
                    title={`Delete "${formState.company}" option`}
                    style={{
                      fontSize: "12px",
                      color: "var(--rose, #ad4940)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      padding: "2px 4px",
                      fontWeight: 600,
                      borderRadius: "var(--radius-xs, 4px)"
                    }}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  className="btn-text-action"
                  onClick={() => {
                    setIsAddingCompany(!isAddingCompany);
                    setIsEditingCompany(false);
                  }}
                  style={{
                    fontSize: "12px",
                    color: "var(--accent, #315e48)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 4px",
                    fontWeight: 600,
                    borderRadius: "var(--radius-xs, 4px)"
                  }}
                >
                  <i className={`fa-solid ${isAddingCompany ? "fa-xmark" : "fa-plus"}`}></i>
                  {isAddingCompany ? "Cancel" : "New"}
                </button>
              </div>
            </div>

            {isAddingCompany && (
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="New company name..."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCompany();
                    }
                  }}
                  style={{ fontSize: "13px", height: "36px" }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleCreateCompany}
                  disabled={!newCompanyName.trim() || isSubmittingCompany}
                  style={{ fontSize: "12px", height: "36px", padding: "0 12px", whiteSpace: "nowrap" }}
                >
                  <i className="fa-solid fa-check"></i> Save
                </button>
              </div>
            )}

            {isEditingCompany && (
              <div style={{ display: "flex", gap: "6px", marginBottom: "8px", alignItems: "center" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Edit company name..."
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleUpdateCompany();
                    }
                  }}
                  style={{ fontSize: "13px", height: "36px" }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleUpdateCompany}
                  disabled={!editCompanyName.trim() || isSubmittingCompany}
                  style={{ fontSize: "12px", height: "36px", padding: "0 12px", whiteSpace: "nowrap" }}
                >
                  <i className="fa-solid fa-check"></i> Update
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditingCompany(false)}
                  style={{ fontSize: "12px", height: "36px", padding: "0 10px" }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="input-wrapper" style={{ position: "relative" }}>
              <i className="fa-solid fa-building"></i>
              <select
                id="passport-company"
                name="company"
                className="form-control"
                value={formState.company || ""}
                onChange={handleInputChange}
                style={{ paddingRight: formState.company ? "70px" : "36px" }}
              >
                <option value="">-- Select Company (Optional) --</option>
                {companies.map((c) => (
                  <option key={c.id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {formState.company && (
                <button
                  type="button"
                  onClick={() => handleInputChange({ target: { name: "company", value: "" } })}
                  title="Unassign company"
                  style={{
                    position: "absolute",
                    right: "32px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "4px",
                    fontSize: "14px"
                  }}
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Personal Identification */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-user"></i>
          </div>
          <div className="section-header-text">
            <h4>Personal Details</h4>
            <p>Holder's official legal identity as printed on document</p>
          </div>
          <span className="section-req-badge">Required</span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="passport-firstName">
              Given / First Name <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.firstName ? "has-error" : ""}`}>
              <i className="fa-solid fa-user"></i>
              <input
                type="text"
                id="passport-firstName"
                name="firstName"
                className={`form-control ${formErrors.firstName ? "is-invalid" : ""}`}
                placeholder="First Name"
                value={formState.firstName || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.firstName && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.firstName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-lastName">
              Surname / Last Name <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.lastName ? "has-error" : ""}`}>
              <i className="fa-solid fa-user-tag"></i>
              <input
                type="text"
                id="passport-lastName"
                name="lastName"
                className={`form-control ${formErrors.lastName ? "is-invalid" : ""}`}
                placeholder="Last Name"
                value={formState.lastName || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.lastName && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.lastName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-sex">
              Gender <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.sex ? "has-error" : ""}`}>
              <i className="fa-solid fa-venus-mars"></i>
              <select
                id="passport-sex"
                name="sex"
                className={`form-control ${formErrors.sex ? "is-invalid" : ""}`}
                value={formState.sex || ""}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Gender</option>
                <option value="M">Male (M)</option>
                <option value="F">Female (F)</option>
                <option value="X">Non-binary / Other (X)</option>
              </select>
            </div>
            {formErrors.sex && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.sex}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="passport-dob">
              Date of Birth <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.dob ? "has-error" : ""}`}>
              <i className="fa-solid fa-cake-candles"></i>
              <input
                type="date"
                id="passport-dob"
                name="dob"
                className={`form-control ${formErrors.dob ? "is-invalid" : ""}`}
                value={formState.dob || ""}
                onChange={handleInputChange}
                required
              />
            </div>
            {formErrors.dob && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.dob}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Place & Location */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-location-dot"></i>
          </div>
          <div className="section-header-text">
            <h4>Place of Issue & Birth</h4>
            <p>Geographical origin details</p>
          </div>
          <span className="section-opt-badge">Optional</span>
        </div>

        <div className="form-grid">
          {optionalCore.map(([name, label, icon, placeholder]) => (
            <div className="form-group" key={name}>
              <label htmlFor={`passport-${name}`}>{label}</label>
              <div className={`input-wrapper ${formErrors[name] ? "has-error" : ""}`}>
                <i className={`fa-solid ${icon}`}></i>
                <input
                  type="text"
                id={`passport-${name}`}
                  name={name}
                  className={`form-control ${formErrors[name] ? "is-invalid" : ""}`}
                  placeholder={placeholder}
                  value={formState[name] || ""}
                  onChange={handleInputChange}
                  autoComplete="off"
                />
              </div>
              {formErrors[name] && (
                <span className="field-error-msg">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  {formErrors[name]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 4: Contact & Communication */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-address-book"></i>
          </div>
          <div className="section-header-text">
            <h4>Contact & Communication</h4>
            <p>Direct communication channels for passport holder</p>
          </div>
          <span className="section-opt-badge">Contact</span>
        </div>

        <div className="form-grid">
          {contactFields.map(([name, label, icon, placeholder]) => (
            <div className="form-group" key={name}>
              <label htmlFor={`passport-${name}`}>{label}</label>
              <div className={`input-wrapper ${formErrors[name] ? "has-error" : ""}`}>
                <i className={`fa-solid ${icon}`}></i>
                <input
                  type="text"
                  id={`passport-${name}`}
                  name={name}
                  className={`form-control ${formErrors[name] ? "is-invalid" : ""}`}
                  placeholder={placeholder}
                  value={formState[name] || ""}
                  onChange={handleInputChange}
                  autoComplete="off"
                />
              </div>
              {formErrors[name] && (
                <span className="field-error-msg">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  {formErrors[name]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Section 5: Extended Records (Collapsible Accordion) */}
      <div className="form-section-card">
        <div
          className="form-section-header collapsible-header"
          onClick={() => setShowOptional(prev => !prev)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowOptional(prev => !prev);
            }
          }}
          aria-expanded={showOptional}
          role="button"
          tabIndex={0}
        >
          <div className="section-icon-pill">
            <i className="fa-solid fa-users"></i>
          </div>
          <div className="section-header-text">
            <h4>Family & Additional Records</h4>
            <p>Parents, spouse, and file archive references</p>
          </div>
          <div className="collapsible-action">
            <span className="section-opt-badge">
              {showOptional ? "Collapse" : "Expand"}
            </span>
            <i className={`fa-solid fa-chevron-${showOptional ? "up" : "down"}`}></i>
          </div>
        </div>

        {showOptional && (
          <div className="form-grid" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border-light)" }}>
            {collapsibleFields.map(([name, label, icon, placeholder]) => (
              <div className="form-group" key={name}>
                <label htmlFor={`passport-${name}`}>{label}</label>
                <div className={`input-wrapper ${formErrors[name] ? "has-error" : ""}`}>
                  <i className={`fa-solid ${icon}`}></i>
                  <input
                    type="text"
                    id={`passport-${name}`}
                    name={name}
                    className={`form-control ${formErrors[name] ? "is-invalid" : ""}`}
                    placeholder={placeholder}
                    value={formState[name] || ""}
                    onChange={handleInputChange}
                    autoComplete="off"
                  />
                </div>
                {formErrors[name] && (
                  <span className="field-error-msg">
                    <i className="fa-solid fa-circle-exclamation"></i>
                    {formErrors[name]}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
