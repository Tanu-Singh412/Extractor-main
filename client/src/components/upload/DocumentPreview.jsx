import React from "react";

export default function DocumentPreview({ previewImage, isScanning, onClear, multiPreviews }) {
  if (!previewImage && (!multiPreviews || !multiPreviews.length)) return null;

  return (
    <div className="preview-container" style={{ position: "relative" }}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        title="Remove Image"
        style={{
          position: "absolute",
          top: "10px",
          right: "10px",
          background: "rgba(220, 38, 38, 0.9)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
          zIndex: 10
        }}
      >
        <i className="fa-solid fa-xmark"></i>
      </button>

      {/* Multi-image thumbnail grid */}
      {multiPreviews && multiPreviews.length > 0 ? (
        <div className="multi-preview-grid">
          <div className="multi-preview-header">
            <i className="fa-solid fa-layer-group"></i>
            <span>{multiPreviews.length} Passport Pages Uploaded</span>
          </div>
          <div className="multi-preview-thumbs">
            {multiPreviews.map((src, idx) => (
              <div className="multi-preview-thumb" key={idx}>
                <div className="thumb-page-label">Page {idx + 1}</div>
                {src.startsWith("__PDF__:") ? (
                  <div className="thumb-placeholder">
                    <i className="fa-solid fa-file-pdf"></i>
                    <span>{src.replace("__PDF__:", "")}</span>
                  </div>
                ) : src === "__PROCESSING__" ? (
                  <div className="thumb-placeholder">
                    <i className="fa-solid fa-file-image"></i>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={`Page ${idx + 1}`}
                    className="passport-thumb-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          {isScanning && (
            <div className="multi-preview-scanning-msg">
              <div className="spinner" style={{ width: "18px", height: "18px" }}></div>
              <span>Merging text from all pages & extracting data...</span>
            </div>
          )}
        </div>
      ) : previewImage.startsWith("__PDF__:") ? (
        <div>
          <i className="fa-solid fa-file-pdf"></i>
          <h4>{previewImage.replace("__PDF__:", "")}</h4>
          <p>{isScanning ? "Extracting text from PDF document..." : "PDF Document Loaded"}</p>
        </div>
      ) : previewImage.startsWith("__MULTI__:") ? (
        <div>
          <i className="fa-solid fa-copy"></i>
          <h4>{previewImage.split(":")[1]} Files Selected</h4>
          <p>{previewImage.split(":").slice(2).join(":")}</p>
        </div>
      ) : previewImage === "__PROCESSING__" ? (
        <div>
          <i className="fa-solid fa-file-image"></i>
          <p>
            {isScanning
              ? "Processing image — preview will appear after extraction..."
              : "Image uploaded — server-side preview loading..."}
          </p>
        </div>
      ) : (
        <img
          src={previewImage}
          crossOrigin="use-credentials"
          alt="Document Preview"
          className="passport-preview-img"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {isScanning && !multiPreviews?.length && (
        <div className="processing-overlay">
          <div className="spinner"></div>
          <span>Extracting text...</span>
        </div>
      )}
    </div>
  );
}
