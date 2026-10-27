import React, { useEffect } from "react";

export default function ConfirmDeleteModal({
  isOpen,
  isDeleting = false,
  onCancel,
  onConfirm
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay confirm-delete-overlay"
      onClick={() => {
        if (!isDeleting) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className="confirm-delete-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="confirm-delete-header">
          <div className="confirm-delete-icon-badge">
            <i className="fa-solid fa-trash-can"></i>
          </div>
          <div className="confirm-delete-header-text">
            <h3 id="confirm-delete-title">Delete Record</h3>
            <p>This action cannot be undone.</p>
          </div>
          <button
            type="button"
            className="confirm-delete-close-btn"
            onClick={onCancel}
            disabled={isDeleting}
            title="Cancel"
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="confirm-delete-body">
          <p className="confirm-delete-message">
            Are you sure you want to permanently delete this record? Once removed, it cannot be recovered.
          </p>
        </div>

        {/* Modal Actions */}
        <div className="confirm-delete-actions">
          <button
            type="button"
            className="btn btn-secondary confirm-btn-cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger confirm-btn-delete"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <span className="spinner" style={{ width: "15px", height: "15px", borderWidth: "2px" }}></span>
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-trash"></i>
                <span>Delete Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
