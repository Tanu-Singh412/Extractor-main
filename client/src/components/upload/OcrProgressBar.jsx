import React from "react";

export default function OcrProgressBar({ show, progressPercent, progressText }) {
  if (!show) return null;

  return (
    <div className="ocr-progress-container">
      <div className="ocr-status-header">
        <span>{progressText}</span>
        <span>{progressPercent}%</span>
      </div>
      <div className="ocr-progress-bar-bg">
        <div
          className="ocr-progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>
    </div>
  );
}
