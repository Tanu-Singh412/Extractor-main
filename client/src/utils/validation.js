export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "image/bmp",
  "image/heic",
  "image/heif",
  "image/avif",
  "application/pdf"
];

export const ALLOWED_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
  ".pdf",
  ".heic",
  ".heif",
  ".avif"
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Validates selected or dropped upload files.
 */
export function validateUploadFiles(files) {
  const errors = [];
  if (!files || files.length === 0) {
    return { valid: false, errors: ["Please select at least one file to upload."] };
  }

  for (const file of files) {
    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    const isMimeAllowed = file.type ? ALLOWED_FILE_TYPES.includes(file.type.toLowerCase()) : false;
    const isExtAllowed = ALLOWED_FILE_EXTENSIONS.includes(ext);

    if (!isMimeAllowed && !isExtAllowed) {
      errors.push(`"${file.name}" is not a supported file type. Please upload an image (JPG, PNG, WebP, TIFF) or PDF document.`);
    }

    if (file.size === 0) {
      errors.push(`"${file.name}" is an empty file (0 bytes).`);
    } else if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      errors.push(`"${file.name}" exceeds the maximum 25MB limit (${sizeMB}MB).`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates Passport form fields.
 */
export function validatePassportForm(formState) {
  const errors = [];
  const fieldErrors = {};

  const addError = (field, message) => {
    errors.push(message);
    if (!fieldErrors[field]) {
      fieldErrors[field] = message;
    }
  };

  // Required presence check
  const required = [
    ["passportNo", "Passport Number"],
    ["issuingCountry", "Issuing Country Code"],
    ["firstName", "First Name"],
    ["lastName", "Last Name"],
    ["nationality", "Nationality"],
    ["sex", "Gender"],
    ["issueDate", "Date of Issue"],
    ["doe", "Date of Expiry"],
    ["dob", "Date of Birth"]
  ];

  required.forEach(([key, label]) => {
    if (!formState[key] || !formState[key].toString().trim()) {
      addError(key, `${label} is required`);
    }
  });

  // Passport Number format (6–9 alphanumeric characters)
  const pno = (formState.passportNo || "").trim();
  if (pno && !/^[A-Z0-9]{6,9}$/i.test(pno)) {
    addError("passportNo", "Passport Number must be 6–9 alphanumeric characters (e.g. A12345678)");
  }

  // Issuing Country (ISO 3166-1 alpha-3 code: exactly 3 letters)
  const iso3 = (formState.issuingCountry || "").trim();
  if (iso3 && !/^[A-Z]{3}$/i.test(iso3)) {
    addError("issuingCountry", "Issuing Country Code must be exactly 3 uppercase letters (e.g. IND)");
  }

  // Nationality (letters and spaces only, 2–35 characters)
  const nat = (formState.nationality || "").trim();
  if (nat && (!/^[A-Za-z\s]{2,35}$/.test(nat) || /\d/.test(nat))) {
    addError("nationality", "Nationality must be 2–35 letters without digits (e.g. IND or UNITED STATES)");
  }

  // First & Last Names
  const firstName = (formState.firstName || "").trim();
  if (firstName) {
    if (firstName.length < 2) {
      addError("firstName", "First Name must be at least 2 characters");
    } else if (/\d/.test(firstName) || /[^A-Za-z\s'\-.]/.test(firstName)) {
      addError("firstName", "First Name can only contain letters, spaces, hyphens, and apostrophes");
    }
  }

  const lastName = (formState.lastName || "").trim();
  if (lastName) {
    if (lastName.length < 2) {
      addError("lastName", "Last Name must be at least 2 characters");
    } else if (/\d/.test(lastName) || /[^A-Za-z\s'\-.]/.test(lastName)) {
      addError("lastName", "Last Name can only contain letters, spaces, hyphens, and apostrophes");
    }
  }

  // Gender
  const sex = (formState.sex || "").trim().toUpperCase();
  if (sex && !["M", "F", "X"].includes(sex)) {
    addError("sex", "Gender must be Male (M), Female (F), or Non-binary / Other (X)");
  }

  // Date Chronology
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dob = null;
  if (formState.dob) {
    dob = new Date(formState.dob);
    if (isNaN(dob.getTime())) {
      addError("dob", "Date of Birth is not a valid date");
    } else if (dob >= today) {
      addError("dob", "Date of Birth must be in the past");
    } else {
      const ageYears = today.getFullYear() - dob.getFullYear();
      if (ageYears > 125) {
        addError("dob", "Date of Birth must be within the last 125 years");
      }
    }
  }

  let issueDate = null;
  if (formState.issueDate) {
    issueDate = new Date(formState.issueDate);
    if (isNaN(issueDate.getTime())) {
      addError("issueDate", "Date of Issue is not a valid date");
    } else {
      if (issueDate > today) {
        addError("issueDate", "Date of Issue cannot be in the future");
      }
      if (dob && !isNaN(dob.getTime()) && issueDate <= dob) {
        addError("issueDate", "Date of Issue cannot be on or before Date of Birth");
      }
    }
  }

  let doe = null;
  if (formState.doe) {
    doe = new Date(formState.doe);
    if (isNaN(doe.getTime())) {
      addError("doe", "Date of Expiry is not a valid date");
    } else {
      if (dob && !isNaN(dob.getTime()) && doe <= dob) {
        addError("doe", "Date of Expiry must be after Date of Birth");
      }
      if (issueDate && !isNaN(issueDate.getTime()) && doe <= issueDate) {
        addError("doe", "Date of Expiry must be strictly after Date of Issue");
      }
    }
  }

  // Optional relatives names
  ["fatherName", "motherName", "spouseName"].forEach(field => {
    const val = (formState[field] || "").trim();
    if (val) {
      if (val.length < 2) {
        addError(field, `${field === "fatherName" ? "Father's" : field === "motherName" ? "Mother's" : "Spouse's"} Name must be at least 2 characters`);
      } else if (/\d/.test(val)) {
        addError(field, "Names cannot contain numbers");
      }
    }
  });

  return { valid: errors.length === 0, errors, fieldErrors };
}

/**
 * Validates Insurance form fields.
 */
export function validateInsuranceForm(formState) {
  const errors = [];
  const fieldErrors = {};

  const addError = (field, message) => {
    errors.push(message);
    if (!fieldErrors[field]) {
      fieldErrors[field] = message;
    }
  };

  // Required presence check
  const required = [
    ["policyNo", "Policy Number"],
    ["provider", "Insurance Provider"],
    ["memberName", "Member Name"]
  ];

  required.forEach(([key, label]) => {
    if (!formState[key] || !formState[key].toString().trim()) {
      addError(key, `${label} is required`);
    }
  });

  // Policy number format
  const pno = (formState.policyNo || "").trim();
  if (pno) {
    if (pno.length < 4 || pno.length > 35) {
      addError("policyNo", "Policy Number must be between 4 and 35 characters");
    } else if (!/^[A-Za-z0-9\-/_.\s]+$/.test(pno)) {
      addError("policyNo", "Policy Number contains invalid special characters");
    }
  }

  // Provider
  const provider = (formState.provider || "").trim();
  if (provider && provider.length < 2) {
    addError("provider", "Provider name must be at least 2 characters");
  }

  // Member Name
  const memberName = (formState.memberName || "").trim();
  if (memberName) {
    if (memberName.length < 2) {
      addError("memberName", "Member Name must be at least 2 characters");
    } else if (/\d/.test(memberName)) {
      addError("memberName", "Member Name cannot contain numbers");
    }
  }

  // Dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dob = null;
  if (formState.dob) {
    dob = new Date(formState.dob);
    if (isNaN(dob.getTime())) {
      addError("dob", "Date of Birth is not a valid date");
    } else if (dob >= today) {
      addError("dob", "Date of Birth must be in the past");
    }
  }

  let effectiveDate = null;
  if (formState.effectiveDate) {
    effectiveDate = new Date(formState.effectiveDate);
    if (isNaN(effectiveDate.getTime())) {
      addError("effectiveDate", "Effective Date is not a valid date");
    }
  }

  let doe = null;
  if (formState.doe) {
    doe = new Date(formState.doe);
    if (isNaN(doe.getTime())) {
      addError("doe", "Expiry Date is not a valid date");
    } else if (effectiveDate && !isNaN(effectiveDate.getTime()) && doe < effectiveDate) {
      addError("doe", "Expiry Date cannot be before Effective Date");
    }
  }

  // Contact fields (if provided)
  const email = (formState.email || "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError("email", "Please enter a valid email address (e.g. user@example.com)");
  }

  const phone = (formState.phone || "").trim();
  if (phone) {
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      addError("phone", "Phone number must be between 7 and 15 digits");
    }
  }

  // Motor specifics (if provided)
  if (formState.manufacturingYear) {
    const yr = Number(formState.manufacturingYear);
    const maxYear = new Date().getFullYear() + 1;
    if (isNaN(yr) || yr < 1900 || yr > maxYear) {
      addError("manufacturingYear", `Manufacturing Year must be between 1900 and ${maxYear}`);
    }
  }

  if (formState.copayPercentage) {
    const copay = Number(formState.copayPercentage);
    if (isNaN(copay) || copay < 0 || copay > 100) {
      addError("copayPercentage", "Copay percentage must be a number between 0 and 100");
    }
  }

  if (formState.ncb) {
    const ncb = Number(formState.ncb);
    if (isNaN(ncb) || ncb < 0 || ncb > 100) {
      addError("ncb", "NCB percentage must be a number between 0 and 100");
    }
  }

  return { valid: errors.length === 0, errors, fieldErrors };
}

/**
 * Validates any supported document form (Passport or Insurance).
 */
export function validateDocumentForm(formState) {
  if (formState?.docType === "INSURANCE") {
    return validateInsuranceForm(formState);
  }
  return validatePassportForm(formState || {});
}
