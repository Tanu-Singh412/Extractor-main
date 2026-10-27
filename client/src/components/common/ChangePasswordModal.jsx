import { useState } from "react";
import { Eye, EyeOff, KeyRound, Lock, X } from "lucide-react";
import { changePassword } from "@/services/api";

export default function ChangePasswordModal({ isOpen, onClose }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!currentPassword) {
      setError("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password cannot be the same as current password.");
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err.message || "Failed to change password. Please verify current password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pwd-modal-backdrop" onClick={handleClose}>
      <div
        className="pwd-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwd-modal-title"
      >
        <div className="pwd-modal-header">
          <div className="pwd-modal-title-wrap">
            <div className="pwd-modal-icon">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 id="pwd-modal-title" className="pwd-modal-title">Change Password</h2>
              <p className="pwd-modal-subtitle">Update your administrator account password</p>
            </div>
          </div>
          <button
            type="button"
            className="pwd-modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="pwd-success-state">
            <div className="pwd-success-icon">
              <Lock size={32} />
            </div>
            <h3>Password Changed!</h3>
            <p>Your password has been updated successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="pwd-modal-form">
            {error && (
              <div className="pwd-modal-error">
                <span>{error}</span>
              </div>
            )}

            <div className="pwd-field-group">
              <label htmlFor="current-pwd">Current Password</label>
              <div className="pwd-input-wrap">
                <input
                  id="current-pwd"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pwd-field-group">
              <label htmlFor="new-pwd">New Password</label>
              <div className="pwd-input-wrap">
                <input
                  id="new-pwd"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pwd-field-group">
              <label htmlFor="confirm-pwd">Confirm New Password</label>
              <div className="pwd-input-wrap">
                <input
                  id="confirm-pwd"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                />
                <button
                  type="button"
                  className="pwd-toggle-btn"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pwd-modal-actions">
              <button
                type="button"
                className="pwd-btn-cancel"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="pwd-btn-submit"
                disabled={loading}
              >
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
