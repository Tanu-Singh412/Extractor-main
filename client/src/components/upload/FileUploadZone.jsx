import React, { useState } from "react";
import { validateUploadFiles } from "../../utils/validation";

export default function FileUploadZone({ onFilesSelected, fileInputRef, onError, documentType = "PASSPORT" }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isInsurance = documentType === "INSURANCE";

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    const files = Array.from(fileList);
    const { valid, errors } = validateUploadFiles(files);
    if (!valid) {
      if (onError) onError(errors[0]);
      return;
    }
    onFilesSelected(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  return (
    <>
      <div
        className={`upload-container ${isDragOver ? "dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-icon-pulse-wrapper">
          <div className="upload-icon">
            <i className="fa-solid fa-cloud-arrow-up"></i>
          </div>
        </div>
        <div className="upload-text">
          <h3>{isInsurance ? "Drop your insurance pages here" : "Drop your passport pages here"}</h3>
          <p className="upload-subtext">
            {isInsurance
              ? "Upload insurance pages for complete extraction"
              : "Upload both pages for complete extraction"}
          </p>
          <div className="upload-format-chips">
            <span className="format-chip">PDF</span>
            <span className="format-chip">JPG</span>
            <span className="format-chip">PNG</span>
            <span className="format-chip">WEBP</span>
            <span className="format-chip">HEIC</span>
          </div>
          <div className="upload-limit-badge">
            Up to 25 MB per file · Multiple pages supported
          </div>
        </div>
        <button
          type="button"
          className="btn btn-secondary upload-browse-btn"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <i className="fa-solid fa-folder-open"></i> Select Files
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="file-input"
        accept="image/*,application/pdf,.pdf,.heic,.heif,.tiff,.tif"
        multiple
      />
    </>
  );
}
