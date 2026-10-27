import React from "react";

export default function ToastContainer({ toasts = [] }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <i
            className={`fa-solid ${
              t.type === "success"
                ? "fa-circle-check"
                : t.type === "error"
                ? "fa-circle-xmark"
                : "fa-circle-info"
            }`}
          ></i>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
