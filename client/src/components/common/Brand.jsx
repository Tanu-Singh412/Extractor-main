import React from "react";

export default function Brand() {
  return (
    <div className="brand" aria-label="DocuExtract">
      <svg className="brand-mark" width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path d="M10 8.5h8l4 4v11H10v-15Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M18 8.5v4h4M13 17h6M13 20h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="brand-name">DocuExtract<span className="brand-caption">Document workspace</span></span>
    </div>
  );
}

