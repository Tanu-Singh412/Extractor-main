import React from "react";

export default function InsuranceForm({ formState, handleInputChange, formErrors = {} }) {
  const healthFields = [
    ["healthCardNo", "Health Card No.", "fa-id-card"],
    ["tpa", "TPA", "fa-building"],
    ["networkHospital", "Network Hospitals", "fa-hospital-user"],
    ["copayPercentage", "Copay %", "fa-percent"],
    ["sumInsured", "Sum Insured", "fa-money-bill"],
    ["roomRentLimit", "Room Rent Limit", "fa-bed"],
    ["hospitalizationLimit", "Hosp. Limit", "fa-hospital"],
    ["waitingPeriod", "Waiting Period", "fa-clock"],
    ["preExistingDisease", "Pre-Existing Dis.", "fa-virus"]
  ];

  const motorFields = [
    ["vehicleNo", "Vehicle No.", "fa-car-side"],
    ["registrationNo", "Registration No.", "fa-id-badge"],
    ["vehicleType", "Vehicle Type", "fa-truck"],
    ["make", "Make", "fa-industry"],
    ["model", "Model", "fa-car"],
    ["variant", "Variant", "fa-layer-group"],
    ["engineNo", "Engine No.", "fa-gear"],
    ["chassisNo", "Chassis No.", "fa-truck-front"],
    ["idv", "IDV (Value)", "fa-money-check-dollar"],
    ["manufacturingYear", "Year", "fa-calendar-days"],
    ["ncb", "NCB %", "fa-percent"],
    ["fuelType", "Fuel Type", "fa-gas-pump"]
  ];

  const lifeFields = [
    ["lifeAssured", "Life Assured", "fa-user-check"],
    ["nomineeName", "Nominee", "fa-users"],
    ["maturityDate", "Maturity Date", "fa-calendar-check"],
    ["deathBenefit", "Death Benefit", "fa-hand-holding-dollar"],
    ["maturityBenefit", "Maturity Benefit", "fa-money-bill-trend-up"],
    ["premium", "Premium Amount", "fa-money-bill-wave"],
    ["policyTermYears", "Term (Years)", "fa-hourglass"]
  ];

  const travelFields = [
    ["travelStartDate", "Start Date", "fa-calendar-plus"],
    ["travelEndDate", "End Date", "fa-calendar-minus"],
    ["destination", "Destination", "fa-location-dot"],
    ["departureCountry", "Departure", "fa-plane-departure"],
    ["arrivalCountry", "Arrival", "fa-plane-arrival"],
    ["tripType", "Trip Type", "fa-route"],
    ["travellerCount", "Travellers", "fa-users"]
  ];

  const contactFields = [
    ["phone", "Phone Number", "fa-phone", "Contact phone number"],
    ["email", "Email Address", "fa-envelope", "Contact email"],
    ["address", "Address", "fa-house", "Full address"]
  ];


  return (
    <div className="form-sections-container">
      {/* Section 1: Policy Credentials */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-file-shield"></i>
          </div>
          <div className="section-header-text">
            <h4>Policy Credentials</h4>
            <p>Underwriter policy number, provider, and coverage duration</p>
          </div>
          <span className="section-req-badge">Required</span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="insurance-insuranceType">
              Insurance Type <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.insuranceType ? "has-error" : ""}`}>
              <i className="fa-solid fa-tags"></i>
              <select
                id="insurance-insuranceType"
                name="insuranceType"
                className={`form-control ${formErrors.insuranceType ? "is-invalid" : ""}`}
                value={formState.insuranceType || ""}
                onChange={handleInputChange}
                required
              >
                <option value="">Select Insurance Type...</option>
                <option value="HEALTH">Health / Medical</option>
                <option value="MOTOR">Motor / Vehicle</option>
                <option value="LIFE">Life Insurance</option>
                <option value="TRAVEL">Travel Insurance</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {formErrors.insuranceType && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.insuranceType}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="insurance-policyNo">
              Policy Number <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.policyNo ? "has-error" : ""}`}>
              <i className="fa-solid fa-file-shield"></i>
              <input
                type="text"
                id="insurance-policyNo"
                name="policyNo"
                className={`form-control ${formErrors.policyNo ? "is-invalid" : ""}`}
                placeholder="e.g. POL-12345678"
                value={formState.policyNo || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.policyNo && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.policyNo}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="insurance-provider">
              Provider / Company <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.provider ? "has-error" : ""}`}>
              <i className="fa-solid fa-hospital"></i>
              <input
                type="text"
                id="insurance-provider"
                name="provider"
                className={`form-control ${formErrors.provider ? "is-invalid" : ""}`}
                placeholder="e.g. Star Health, LIC, HDFC Ergo"
                value={formState.provider || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.provider && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.provider}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="insurance-groupNo">Group Number</label>
            <div className={`input-wrapper ${formErrors.groupNo ? "has-error" : ""}`}>
              <i className="fa-solid fa-layer-group"></i>
              <input
                type="text"
                id="insurance-groupNo"
                name="groupNo"
                className={`form-control ${formErrors.groupNo ? "is-invalid" : ""}`}
                placeholder="e.g. GRP-0042 (optional)"
                value={formState.groupNo || ""}
                onChange={handleInputChange}
                autoComplete="off"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="insurance-effectiveDate">Effective Date</label>
            <div className={`input-wrapper ${formErrors.effectiveDate ? "has-error" : ""}`}>
              <i className="fa-solid fa-calendar"></i>
              <input
                type="date"
                id="insurance-effectiveDate"
                name="effectiveDate"
                className={`form-control ${formErrors.effectiveDate ? "is-invalid" : ""}`}
                value={formState.effectiveDate || ""}
                onChange={handleInputChange}
              />
            </div>
            {formErrors.effectiveDate && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.effectiveDate}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="insurance-doe">Expiry Date</label>
            <div className={`input-wrapper ${formErrors.doe ? "has-error" : ""}`}>
              <i className="fa-solid fa-calendar-check"></i>
              <input
                type="date"
                id="insurance-doe"
                name="doe"
                className={`form-control ${formErrors.doe ? "is-invalid" : ""}`}
                value={formState.doe || ""}
                onChange={handleInputChange}
              />
            </div>
            {formErrors.doe && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.doe}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Insured Member */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-user"></i>
          </div>
          <div className="section-header-text">
            <h4>Insured Member Details</h4>
            <p>Primary policyholder or beneficiary name</p>
          </div>
          <span className="section-req-badge">Required</span>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="insurance-memberName">
              Member Full Name <span className="req-star">*</span>
            </label>
            <div className={`input-wrapper ${formErrors.memberName ? "has-error" : ""}`}>
              <i className="fa-solid fa-user"></i>
              <input
                type="text"
                id="insurance-memberName"
                name="memberName"
                className={`form-control ${formErrors.memberName ? "is-invalid" : ""}`}
                placeholder="Full legal name of insured member"
                value={formState.memberName || ""}
                onChange={handleInputChange}
                required
                autoComplete="off"
              />
            </div>
            {formErrors.memberName && (
              <span className="field-error-msg">
                <i className="fa-solid fa-circle-exclamation"></i>
                {formErrors.memberName}
              </span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="insurance-dob">Date of Birth</label>
            <div className={`input-wrapper ${formErrors.dob ? "has-error" : ""}`}>
              <i className="fa-solid fa-cake-candles"></i>
              <input
                type="date"
                id="insurance-dob"
                name="dob"
                className={`form-control ${formErrors.dob ? "is-invalid" : ""}`}
                value={formState.dob || ""}
                onChange={handleInputChange}
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

      {/* Section 3: Type Specific Details */}
      {formState.insuranceType === "HEALTH" && (
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="section-icon-pill">
              <i className="fa-solid fa-briefcase-medical"></i>
            </div>
            <div className="section-header-text">
              <h4>Health Coverage Details</h4>
              <p>Medical network, limits, and deductible specs</p>
            </div>
            <span className="section-opt-badge">Health Spec</span>
          </div>
          <div className="form-grid">
            {healthFields.map(([name, label, icon]) => (
              <div className="form-group" key={name}>
                <label htmlFor={`insurance-${name}`}>{label}</label>
                <div className="input-wrapper">
                  <i className={`fa-solid ${icon}`}></i>
                  <input
                    type="text"
                id={`insurance-${name}`}
                    name={name}
                    className="form-control"
                    value={formState[name] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formState.insuranceType === "MOTOR" && (
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="section-icon-pill">
              <i className="fa-solid fa-car"></i>
            </div>
            <div className="section-header-text">
              <h4>Vehicle & Motor Details</h4>
              <p>Registration, engine, chassis, and make specs</p>
            </div>
            <span className="section-opt-badge">Motor Spec</span>
          </div>
          <div className="form-grid">
            {motorFields.map(([name, label, icon]) => (
              <div className="form-group" key={name}>
                <label htmlFor={`insurance-${name}`}>{label}</label>
                <div className="input-wrapper">
                  <i className={`fa-solid ${icon}`}></i>
                  <input
                    type="text"
                id={`insurance-${name}`}
                    name={name}
                    className="form-control"
                    value={formState[name] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formState.insuranceType === "LIFE" && (
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="section-icon-pill">
              <i className="fa-solid fa-heart-pulse"></i>
            </div>
            <div className="section-header-text">
              <h4>Life Insurance Details</h4>
              <p>Assured benefit, nominee, and maturity schedule</p>
            </div>
            <span className="section-opt-badge">Life Spec</span>
          </div>
          <div className="form-grid">
            {lifeFields.map(([name, label, icon]) => (
              <div className="form-group" key={name}>
                <label htmlFor={`insurance-${name}`}>{label}</label>
                <div className="input-wrapper">
                  <i className={`fa-solid ${icon}`}></i>
                  <input
                    type="text"
                id={`insurance-${name}`}
                    name={name}
                    className="form-control"
                    value={formState[name] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formState.insuranceType === "TRAVEL" && (
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="section-icon-pill">
              <i className="fa-solid fa-plane"></i>
            </div>
            <div className="section-header-text">
              <h4>Travel Insurance Details</h4>
              <p>Destination, trip duration, and itinerary limits</p>
            </div>
            <span className="section-opt-badge">Travel Spec</span>
          </div>
          <div className="form-grid">
            {travelFields.map(([name, label, icon]) => (
              <div className="form-group" key={name}>
                <label htmlFor={`insurance-${name}`}>{label}</label>
                <div className="input-wrapper">
                  <i className={`fa-solid ${icon}`}></i>
                  <input
                    type="text"
                id={`insurance-${name}`}
                    name={name}
                    className="form-control"
                    value={formState[name] || ""}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Contact Details */}
      <div className="form-section-card">
        <div className="form-section-header">
          <div className="section-icon-pill">
            <i className="fa-solid fa-address-book"></i>
          </div>
          <div className="section-header-text">
            <h4>Contact & Communication</h4>
            <p>Direct communication channels for policyholder</p>
          </div>
          <span className="section-opt-badge">Contact</span>
        </div>

        <div className="form-grid">
          {contactFields.map(([name, label, icon, placeholder]) => (
            <div className="form-group" key={name}>
              <label htmlFor={`insurance-${name}`}>{label}</label>
              <div className={`input-wrapper ${formErrors[name] ? "has-error" : ""}`}>
                <i className={`fa-solid ${icon}`}></i>
                <input
                  type="text"
                id={`insurance-${name}`}
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
    </div>
  );
}
