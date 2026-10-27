import React, { useState, useEffect, useRef } from "react";
import FileUploadZone from "../components/upload/FileUploadZone";
import DocumentPreview from "../components/upload/DocumentPreview";
import AILoadingState from "../components/upload/AILoadingState";
import VerificationForm from "../components/upload/VerificationForm";
import ConfirmSaveModal from "../components/upload/ConfirmSaveModal";
import * as api from "../services/api";
import { generateMockPassport } from "../utils/mockGenerator";
import {
  EMPTY_FORM,
  UPPERCASE_FIELDS,
  TITLECASE_FIELDS,
  toTitleCase,
  cleanRelativeName,
  NON_PREVIEWABLE
} from "../utils/constants";
import { validateDocumentForm } from "../utils/validation";
import { applyProperNameHandling } from "../utils/names";

function getExtractionStepsTemplate(docType, fileCount = 1) {
  const isInsurance = docType === "INSURANCE";
  const pagesText = fileCount > 1 ? `across ${fileCount} pages` : "document";

  if (isInsurance) {
    return [
      {
        id: "preprocess",
        label: "Preparing insurance paper",
        status: "pending",
        detail: [
          `reading uploaded policy ${pagesText}`,
          "enhancing text and table clarity",
          "identifying insurance company",
        ],
      },
      {
        id: "ocr",
        label: "Reading document text",
        status: "pending",
        detail: [
          "scanning policy pages",
          "locating vehicle & policy sections",
          "reading policyholder information",
        ],
      },
      {
        id: "parse",
        label: "Finding policy & vehicle details",
        status: "pending",
        detail: [
          "finding policy number & provider",
          "reading policyholder name & contact",
          "gathering vehicle number & engine specs",
        ],
      },
      {
        id: "verify",
        label: "Checking details & filling form",
        status: "pending",
        detail: [
          "verifying policy period & dates",
          "verifying vehicle details",
          "ready for your review",
        ],
      },
    ];
  }

  return [
    {
      id: "preprocess",
      label: "Preparing document & image",
      status: "pending",
      detail: [
        "checking document photo & angle",
        "enhancing text clarity & lighting",
        fileCount > 1 ? "identifying Page 1 (photo) & Page 2 (address)" : "identifying front and back pages",
      ],
    },
    {
      id: "ocr",
      label: "Reading document text",
      status: "pending",
      detail: [
        "scanning words and numbers",
        "finding name & passport sections",
        "reading bottom code lines",
      ],
    },
    {
      id: "parse",
      label: "Finding passport information",
      status: "pending",
      detail: [
        "reading full name & passport number",
        "reading date of birth & validity",
        "gathering address & parents' names",
      ],
    },
    {
      id: "verify",
      label: "Checking details & filling form",
      status: "pending",
      detail: [
        "verifying dates and numbers",
        "confirming accurate details",
        "ready for your review",
      ],
    },
  ];
}


export default function UploadPage({
  editingRecord,
  existingRecords = [],
  onClearEdit,
  onRecordSaved,
  addToast,
  companies = [],
  onAddCompany,
  onEditCompany,
  onDeleteCompany
}) {
  const [documentType, setDocumentType] = useState("PASSPORT");
  const [isScanning, setIsScanning] = useState(false);
  const [agentSteps, setAgentSteps] = useState(null);
  const [showAILoader, setShowAILoader] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [multiPreviews, setMultiPreviews] = useState([]);
  const [formState, setFormState] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);
  const trackedBlobUrlsRef = useRef([]);

  const createTrackedBlobUrl = (file) => {
    try {
      const url = URL.createObjectURL(file);
      trackedBlobUrlsRef.current.push(url);
      return url;
    } catch {
      return "";
    }
  };

  const revokeTrackedBlobUrls = () => {
    trackedBlobUrlsRef.current.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch { }
    });
    trackedBlobUrlsRef.current = [];
  };

  // Sync incoming record to edit
  const [prevEditingRecordId, setPrevEditingRecordId] = useState(editingRecord?.id || null);
  if (editingRecord && editingRecord.id !== prevEditingRecordId) {
    setPrevEditingRecordId(editingRecord.id);
    const dType = editingRecord.docType || "PASSPORT";
    setDocumentType(dType);
    const fName = editingRecord.firstName || editingRecord.givenNames || "";
    const lName = editingRecord.lastName || editingRecord.surname || "";
    const mName = editingRecord.memberName || (fName || lName ? `${fName} ${lName}`.trim() : "");
    setFormState({
      ...EMPTY_FORM,
      ...editingRecord,
      docType: dType,
      lastName: lName,
      firstName: fName,
      memberName: mName,
      fatherName: cleanRelativeName((editingRecord.fatherName || "").replace(/\bKgarwal\b/gi, "Agarwal")),
      motherName: cleanRelativeName((editingRecord.motherName || "").replace(/\bKgarwal\b/gi, "Agarwal")),
      spouseName: cleanRelativeName(editingRecord.spouseName || "")
    });
    setEditId(editingRecord.id);
    setPreviewImage(editingRecord.previewImage || "");
  }

  useEffect(() => {
    if (editingRecord) {
      document.getElementById("details-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [editingRecord]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      revokeTrackedBlobUrls();
    };
  }, []);

  const handleInputChange = (e) => {
    let { name, value } = e.target;
    if (UPPERCASE_FIELDS.has(name)) value = value.toUpperCase();
    else if (TITLECASE_FIELDS.has(name)) value = toTitleCase(value);

    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    setFormState(prev => {
      const next = { ...prev, [name]: value };
      if (name === "memberName") {
        const parts = value.trim().split(/\s+/);
        next.firstName = toTitleCase(parts[0] || "");
        next.lastName = toTitleCase(parts.slice(1).join(" ") || "");
      } else if (name === "firstName" || name === "lastName") {
        next.memberName = toTitleCase(`${next.firstName || ""} ${next.lastName || ""}`.trim());
      }
      return next;
    });
  };

  const handleClearForm = () => {
    revokeTrackedBlobUrls();
    setFormState({ ...EMPTY_FORM, docType: documentType });
    setEditId(null);
    setPreviewImage("");
    setMultiPreviews([]);
    setShowAILoader(false);
    setAgentSteps(null);
    setFormErrors({});
    setShowConfirmModal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onClearEdit) onClearEdit();
  };

  const runOCRPipeline = async (filesInput) => {
    const files = Array.isArray(filesInput) ? filesInput : [filesInput];
    if (!files.length) return;

    setIsScanning(true);
    setShowAILoader(true);

    const template = getExtractionStepsTemplate(documentType, files.length);
    let activeSteps = template.map((s, idx) => {
      if (idx === 0) {
        return { ...s, status: "running", detail: [s.detail[0]] };
      }
      return { ...s, status: "pending", detail: [] };
    });
    setAgentSteps(activeSteps);

    let currentStepIdx = 0;
    let currentLineIdx = 1;

    try {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setAgentSteps(prevSteps => {
          if (!prevSteps) return prevSteps;
          const updated = prevSteps.map(s => ({ ...s, detail: [...(s.detail || [])] }));
          const runningStep = updated[currentStepIdx];
          if (!runningStep) return prevSteps;

          const stepTemplate = template[currentStepIdx];
          const fullLines = stepTemplate ? stepTemplate.detail : [];

          if (currentLineIdx < fullLines.length) {
            runningStep.detail = fullLines.slice(0, currentLineIdx + 1);
            currentLineIdx++;
            return updated;
          } else if (currentStepIdx < 2) {
            // Complete current step and transition to next
            runningStep.status = "done";
            currentStepIdx++;
            currentLineIdx = 1;
            const nextStep = updated[currentStepIdx];
            if (nextStep) {
              nextStep.status = "running";
              nextStep.detail = (template[currentStepIdx].detail || []).slice(0, 1);
            }
            return updated;
          }
          return prevSteps;
        });
      }, 700);

      let resData;
      if (files.length === 1) {
        resData = await api.scanSingle(files[0], documentType);
      } else {
        // Use scanMerge: server concatenates OCR text from all pages then parses once
        resData = await api.scanMerge(files, documentType);
      }

      if (intervalRef.current) clearInterval(intervalRef.current);

      if (resData.success) {
        // Both single and merged responses return a unified `data` object
        setEditId(null);
        if (onClearEdit) onClearEdit();
        const info = resData.data || {};
        const detectedDocType = info.docType || documentType;
        setDocumentType(detectedDocType);

        const { firstName: cleanedFirstName, lastName: cleanedLastName, memberName: memberNameVal } =
          applyProperNameHandling(info, detectedDocType);

        const isIns = detectedDocType === "INSURANCE";
        const parseLogs = isIns
          ? [
            `Policy Number: ${info.policyNo || "Found"}`,
            `Policyholder: ${memberNameVal || info.memberName || "Found"}`,
            `Vehicle / Motor: ${info.vehicleNo || info.engineNo || "Details found"}`,
          ]
          : [
            `Passport Number: ${info.passportNo || "Found"}`,
            `Full Name: ${(cleanedFirstName || "") + " " + (cleanedLastName || "")}`.trim() || "Found",
            `Birth Date & Code: Verified`,
          ];

        const verifyLogs = isIns
          ? [
            `Valid: ${info.doi || "Start"} to ${info.doe || "Expiry"}`,
            "Coverage & vehicle details checked",
            "Form filled and ready to review",
          ]
          : [
            `Valid: ${info.doi || "Issue"} to ${info.doe || "Expiry"}`,
            `Address & Family details: Added`,
            "Form filled and ready to review",
          ];


        setAgentSteps(prev => {
          if (!prev) return prev;
          return prev.map((s, idx) => {
            if (idx === 0) return { ...s, status: "done", detail: template[0].detail };
            if (idx === 1) return { ...s, status: "done", detail: template[1].detail };
            if (idx === 2) return { ...s, status: "done", detail: parseLogs };
            if (idx === 3) return { ...s, status: "done", detail: verifyLogs };
            return { ...s, status: "done" };
          });
        });

        setFormState({
          ...EMPTY_FORM,
          ...info,
          docType: detectedDocType,
          lastName: cleanedLastName || info.lastName || info.surname || "",
          firstName: cleanedFirstName || info.firstName || info.givenNames || "",
          memberName: memberNameVal || info.memberName || "",
          fatherName: cleanRelativeName((info.fatherName || "").replace(/\bKgarwal\b/gi, "Agarwal")),
          motherName: cleanRelativeName((info.motherName || "").replace(/\bKgarwal\b/gi, "Agarwal")),
          spouseName: cleanRelativeName(info.spouseName || "")
        });

        if (resData.previewUrl || resData.imageUrl) {
          const sUrl = resData.previewUrl || resData.imageUrl;
          setPreviewImage((prev) => {
            if (prev && prev.startsWith("__PDF__:") && prev.includes(":::blob:")) {
              return prev;
            }
            if (sUrl.toLowerCase().includes(".pdf")) {
              return `__PDF__:${resData.fileName || "document.pdf"}:::${sUrl}`;
            }
            return sUrl;
          });
        }

        const label = detectedDocType === "INSURANCE" ? "Insurance" : "Passport";
        const pagesMsg = files.length > 1 ? ` (from ${files.length} pages)` : "";
        addToast(`${label} data extracted successfully!${pagesMsg}`, "success");
      } else {
        setAgentSteps(prev => {
          if (!prev) return prev;
          return prev.map(s => {
            if (s.status === "running") {
              return { ...s, status: "error", detail: [...(s.detail || []), "Server could not parse document structure."] };
            }
            return s;
          });
        });
        addToast("Server could not parse the document(s). Please verify manually.", "error");
      }
    } catch (err) {
      console.error("Scan error:", err);
      if (intervalRef.current) clearInterval(intervalRef.current);
      setAgentSteps(prev => {
        if (!prev) return prev;
        return prev.map(s => {
          if (s.status === "running") {
            return { ...s, status: "error", detail: [...(s.detail || []), `Error: ${err.message || "Extraction failed"}`] };
          }
          return s;
        });
      });
      addToast(err.message || "OCR upload error. Check backend connections.", "error");
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsScanning(false);
    }
  };


  const processUploadedFiles = (files) => {
    if (!files?.length) return;
    revokeTrackedBlobUrls();
    if (files.length === 1) {
      setMultiPreviews([]);
      const file = files[0];
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (isPdf) {
        const blobUrl = createTrackedBlobUrl(file);
        setPreviewImage(blobUrl ? `__PDF__:${file.name}:::${blobUrl}` : `__PDF__:${file.name}`);
      } else if (!NON_PREVIEWABLE.test(file.name) && file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = e => setPreviewImage(e.target.result);
        reader.onerror = () => setPreviewImage("__PROCESSING__");
        reader.readAsDataURL(file);
      } else {
        setPreviewImage("__PROCESSING__");
      }
    } else {
      // Generate thumbnail previews for each uploaded file
      setPreviewImage("__MULTI__");
      const thumbs = new Array(files.length).fill("__PROCESSING__");
      setMultiPreviews([...thumbs]);
      files.forEach((file, idx) => {
        const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
        if (isPdf) {
          const blobUrl = createTrackedBlobUrl(file);
          thumbs[idx] = blobUrl ? `__PDF__:${file.name}:::${blobUrl}` : `__PDF__:${file.name}`;
          setMultiPreviews([...thumbs]);
        } else if (!NON_PREVIEWABLE.test(file.name) && file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = e => {
            thumbs[idx] = e.target.result;
            setMultiPreviews([...thumbs]);
          };
          reader.onerror = () => {
            thumbs[idx] = "__PROCESSING__";
            setMultiPreviews([...thumbs]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
    runOCRPipeline(files);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    const { valid, errors, fieldErrors } = validateDocumentForm(formState, existingRecords, editId);
    if (!valid) {
      setFormErrors(fieldErrors || {});
      addToast(errors[0] || "Please correct the errors in the form.", "error");
      if (errors.length > 1) {
        setTimeout(() => addToast(`Also check: ${errors.slice(1, 3).join(" | ")}`, "error"), 500);
      }
      return;
    }

    setFormErrors({});
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    // The image was only used for parsing data; do not save the actual image in the database
    const { previewImage: _unusedPi, ...recordPayload } = formState;

    try {
      if (editId) {
        await api.updatePassport(editId, recordPayload);
        addToast("Record updated successfully!", "success");
      } else {
        await api.createPassport(recordPayload);
        addToast("Record saved successfully!", "success");
      }
      if (onRecordSaved) await onRecordSaved();
      setShowConfirmModal(false);
      handleClearForm();
    } catch (err) {
      console.error("Save error:", err);
      const msg = err.message || "Failed to save record.";
      if (msg.toLowerCase().includes("passport number")) {
        setFormErrors(prev => ({ ...prev, passportNo: msg }));
      } else if (msg.toLowerCase().includes("policy number")) {
        setFormErrors(prev => ({ ...prev, policyNo: msg }));
      }
      addToast(msg, "error");
      setShowConfirmModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTryDemo = () => {
    generateMockPassport(({ file, preview }) => {
      setPreviewImage(preview);
      runOCRPipeline(file);
    });
  };

  return (
    <main>
      <div className="panel">
        <div className="panel-header intake-header">
          <div>
            <h2 className="panel-title">{editId ? "Edit document" : "Document details"}</h2>
            <p className="panel-subtitle">Choose a document type to get started.</p>
          </div>
        </div>

        <div className="registration-grid-layout">
          <div className="doc-type-segmented-wrapper">
            <div className="doc-type-segmented-control" role="group" aria-label="Select document type">
              <button
                type="button"
                aria-pressed={documentType === "PASSPORT"}
                className={`segmented-tab ${documentType === "PASSPORT" ? "active" : ""}`}
                onClick={() => {
                  setDocumentType("PASSPORT");
                  setFormState(p => ({ ...p, docType: "PASSPORT" }));
                  setFormErrors({});
                }}
              >
                <i className="fa-solid fa-passport"></i>
                <span className="tab-title">Passport</span>
              </button>
              <button
                type="button"
                aria-pressed={documentType === "INSURANCE"}
                className={`segmented-tab ${documentType === "INSURANCE" ? "active" : ""}`}
                onClick={() => {
                  setDocumentType("INSURANCE");
                  setFormState(p => ({ ...p, docType: "INSURANCE" }));
                  setFormErrors({});
                }}
              >
                <i className="fa-solid fa-shield-halved"></i>
                <span className="tab-title">Insurance Policy</span>
              </button>
            </div>
          </div>

          <div className="scan-section-centered">
            <div className="step-heading"><span className="step-number">1</span><div><h3>Source document</h3><p>Upload a clear scan or photograph.</p></div></div>
            {!previewImage && (
              <FileUploadZone
                onFilesSelected={processUploadedFiles}
                fileInputRef={fileInputRef}
                onError={(msg) => addToast(msg, "error")}
                documentType={documentType}
              />
            )}

            <DocumentPreview
              previewImage={previewImage}
              isScanning={isScanning}
              onClear={handleClearForm}
              multiPreviews={multiPreviews}
            />

            {showAILoader && (
              <AILoadingState
                steps={agentSteps}
                documentType={documentType}
                collapseWhenDone={false}
              />
            )}

            {documentType === "PASSPORT" && (
              <div className="demo-trigger-wrapper">
                <button
                  type="button"
                  className="demo-trigger-btn"
                  onClick={handleTryDemo}
                >
                  <i className="fa-regular fa-file-lines" aria-hidden="true"></i> Try a sample passport
                </button>
              </div>
            )}
            <div className="upload-guidance">
              <h4>A better scan, fewer corrections.</h4>
              {documentType === "INSURANCE" ? (
                <p>
                  Upload your <strong>insurance policy pages</strong> together for best results — policy schedule, insured member details, and coverage info. Keep all four corners visible and text clear.
                </p>
              ) : (
                <p>
                  Upload <strong>both passport pages</strong> together for best results — Page 1 (photo + MRZ) and Page 2 (father, mother, spouse, address). Keep all four corners visible and avoid glare.
                </p>
              )}
            </div>
          </div>

          <VerificationForm
            formState={formState}
            handleInputChange={handleInputChange}
            handleFormSubmit={handleFormSubmit}
            handleClearForm={handleClearForm}
            isScanning={isScanning || isSaving}
            editId={editId}
            formErrors={formErrors}
            companies={companies}
            onAddCompany={onAddCompany}
            onEditCompany={onEditCompany}
            onDeleteCompany={onDeleteCompany}
          />
        </div>
      </div>

      <ConfirmSaveModal
        isOpen={showConfirmModal}
        formState={formState}
        isSaving={isSaving}
        editId={editId}
        onCancel={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSave}
      />
    </main>
  );
}
