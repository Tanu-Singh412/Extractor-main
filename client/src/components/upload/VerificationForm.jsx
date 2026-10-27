import React from "react";
import PassportForm from "./PassportForm";
import InsuranceForm from "./InsuranceForm";

export default function VerificationForm({
  formState,
  handleInputChange,
  handleFormSubmit,
  handleClearForm,
  isScanning,
  editId,
  formErrors = {},
  companies = [],
  onAddCompany,
  onEditCompany,
  onDeleteCompany
}) {
  return (
    <form id="details-form" onSubmit={handleFormSubmit} className="details-form-centered">
      <div className="step-heading"><span className="step-number">2</span><div><h3>Review details</h3><p>Check the extracted information before saving.</p></div></div>

      {formState.docType === "PASSPORT" ? (
        <PassportForm
          formState={formState}
          handleInputChange={handleInputChange}
          formErrors={formErrors}
          companies={companies}
          onAddCompany={onAddCompany}
          onEditCompany={onEditCompany}
          onDeleteCompany={onDeleteCompany}
        />
      ) : (
        <InsuranceForm
          formState={formState}
          handleInputChange={handleInputChange}
          formErrors={formErrors}
        />
      )}

      <div className="form-actions-centered">
        <button
          type="submit"
          className="btn btn-primary btn-submit-centered"
          disabled={isScanning}
        >
          <i className="fa-solid fa-floppy-disk"></i>{" "}
          {editId ? "Update Record" : "Save Record"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleClearForm}
        >
          <i className="fa-solid fa-eraser"></i> Clear
        </button>
        {editId && (
          <span className="edit-hint">
            <i className="fa-solid fa-pen"></i> Editing record #{editId}
          </span>
        )}
      </div>
    </form>
  );
}
