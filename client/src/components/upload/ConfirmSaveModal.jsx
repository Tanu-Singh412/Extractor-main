import React, { useEffect } from "react";

export default function ConfirmSaveModal({
  isOpen,
  isSaving,
  editId,
  onCancel,
  onConfirm
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isSaving) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay confirm-save-overlay"
      onClick={() => {
        if (!isSaving) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="confirm-save-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon-badge">
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="confirm-modal-header-text">
            <h3 id="confirm-modal-title">Please Recheck All Details</h3>
            <p>Verify all extracted fields manually before saving.</p>
          </div>
          <button
            type="button"
            className="confirm-modal-close-btn"
            onClick={onCancel}
            disabled={isSaving}
            title="Close dialog"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="confirm-modal-body">
          <p className="confirm-modal-message">
            Have you checked the extracted details? If you haven't reviewed them yet, please <strong>go back and check</strong> manually against the document to make sure there are no mistakes.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn btn-secondary confirm-btn-back"
            onClick={onCancel}
            disabled={isSaving}
          >
            <i className="fa-solid fa-arrow-left"></i> Go Back & Check
          </button>
          <button
            type="button"
            className="btn btn-primary confirm-btn-save"
            onClick={onConfirm}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i>
                <span>{editId ? "Save Changes" : "Save Record"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
