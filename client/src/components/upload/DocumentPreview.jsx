import React from "react";

export default function DocumentPreview({
  previewImage,
  isScanning,
  onClear,
  multiPreviews
}) {
  if (!previewImage && (!multiPreviews || !multiPreviews.length)) return null;

  const parsePdfInfo = (src) => {
    if (!src || typeof src !== "string") return null;
    if (src.startsWith("__PDF__:")) {
      const parts = src.replace("__PDF__:", "").split(":::");
      return {
        name: parts[0] || "document.pdf",
        url: parts[1] || ""
      };
    }
    if (src.toLowerCase().includes(".pdf") || src.startsWith("data:application/pdf")) {
      const cleanUrl = src.split("?")[0];
      const name = cleanUrl.split("/").pop() || "document.pdf";
      return {
        name,
        url: src
      };
    }
    return null;
  };

  const pdfInfo = parsePdfInfo(previewImage);

  return (
    <div className={`preview-container ${pdfInfo ? "has-pdf" : ""}`}>
      {/* Floating remove button for images / multi-thumbnails only */}
      {!pdfInfo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          title="Remove Document"
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "rgba(220, 38, 38, 0.95)",
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
            zIndex: 30
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      )}

      {/* Multi-image thumbnail grid */}
      {multiPreviews && multiPreviews.length > 0 ? (
        <div className="multi-preview-grid">
          <div className="multi-preview-header">
            <i className="fa-solid fa-layer-group"></i>
            <span>{multiPreviews.length} Pages Uploaded</span>
          </div>
          <div className="multi-preview-thumbs">
            {multiPreviews.map((src, idx) => {
              const itemPdf = parsePdfInfo(src);
              return (
                <div className="multi-preview-thumb" key={idx}>
                  <div className="thumb-page-label">Page {idx + 1}</div>
                  {itemPdf ? (
                    <div
                      className="thumb-placeholder thumb-pdf"
                      onClick={() => {
                        if (itemPdf.url) window.open(itemPdf.url, "_blank");
                      }}
                      title="Click to view PDF in new tab"
                      style={{
                        cursor: itemPdf.url ? "pointer" : "default",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "6px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px",
                        gap: "6px",
                        height: "100%"
                      }}
                    >
                      <i className="fa-solid fa-file-pdf" style={{ fontSize: "28px", color: "#dc2626" }}></i>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "#991b1b",
                          maxWidth: "90px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {itemPdf.name}
                      </span>
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
              );
            })}
          </div>
          {isScanning && (
            <div className="multi-preview-scanning-msg">
              <div className="spinner" style={{ width: "18px", height: "18px" }}></div>
              <span>Merging text from all pages & extracting data...</span>
            </div>
          )}
        </div>
      ) : pdfInfo ? (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Top PDF Bar */}
          <div className="pdf-preview-bar">
            <div className="pdf-file-info">
              <i className="fa-solid fa-file-pdf" style={{ color: "#dc2626", fontSize: "16px", flexShrink: 0 }}></i>
              <span className="pdf-filename" title={pdfInfo.name}>
                {pdfInfo.name}
              </span>
              <span className="pdf-tag">
                PDF
              </span>
            </div>

            <div className="pdf-actions">
              {pdfInfo.url ? (
                <a
                  href={pdfInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pdf-btn-open"
                  title="Open PDF in new tab"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>Open</span>
                </a>
              ) : null}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="pdf-btn-remove"
                title="Remove Document"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>

          {/* Interactive PDF Iframe */}
          {pdfInfo.url ? (
            <div className="pdf-iframe-wrapper">
              <iframe
                src={`${pdfInfo.url}#toolbar=0&navpanes=0&view=Fit`}
                title={`PDF Preview - ${pdfInfo.name}`}
              />
            </div>
          ) : (
            <div style={{ padding: "40px 20px", textAlign: "center" }}>
              <i className="fa-solid fa-file-pdf" style={{ fontSize: "42px", color: "#dc2626", marginBottom: "12px" }}></i>
              <h4 style={{ margin: "6px 0", fontSize: "14px" }}>{pdfInfo.name}</h4>
              <p style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                {isScanning ? "Extracting document fields from PDF..." : "PDF document loaded"}
              </p>
            </div>
          )}
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
        <div className="processing-overlay" style={{ zIndex: 25 }}>
          <div className="spinner"></div>
          <span>{pdfInfo ? "Extracting text from PDF..." : "Extracting text..."}</span>
        </div>
      )}
    </div>
  );
}
