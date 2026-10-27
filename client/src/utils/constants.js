// Default empty form template for passport/insurance fields
export const EMPTY_FORM = {
  docType: "PASSPORT",
  passportNo: "",
  issuingCountry: "",
  nationality: "",
  sex: "",
  issueDate: "",
  doe: "",
  dob: "",
  placeOfIssue: "",
  placeOfBirth: "",

  address: "",
  fatherName: "",
  motherName: "",
  spouseName: "",
  oldPassportNo: "",
  fileNo: "",
  firstName: "",
  lastName: "",
  memberName: "",

  // Insurance specific fields
  insuranceType: "",
  policyNo: "",
  provider: "",
  groupNo: "",
  effectiveDate: "",
  phone: "",
  email: "",
  healthCardNo: "",
  tpa: "",
  networkHospital: "",
  copayPercentage: "",
  sumInsured: "",
  roomRentLimit: "",
  hospitalizationLimit: "",
  waitingPeriod: "",
  preExistingDisease: "",
  vehicleNo: "",
  registrationNo: "",
  vehicleType: "",
  make: "",
  model: "",
  variant: "",
  engineNo: "",
  chassisNo: "",
  idv: "",
  manufacturingYear: "",
  ncb: "",
  fuelType: "",
  lifeAssured: "",
  nomineeName: "",
  maturityDate: "",
  deathBenefit: "",
  maturityBenefit: "",
  premium: "",
  policyTermYears: "",
  travelStartDate: "",
  travelEndDate: "",
  destination: "",
  departureCountry: "",
  arrivalCountry: "",
  tripType: "",
  travellerCount: ""
};

/** Strip short (≤3-char) trailing OCR-garbage tokens from family member names. */
export function cleanRelativeName(s) {
  if (!s) return s;
  const words = s.trim().split(/\s+/);
  while (words.length > 2) {
    if (words[words.length - 1].length <= 3) words.pop();
    else break;
  }
  return words.join(" ");
}

// Fields auto-uppercased as user types
export const UPPERCASE_FIELDS = new Set([
  "passportNo", "issuingCountry", "nationality", "sex", "oldPassportNo", "fileNo"
]);

// Fields auto-Title-Cased as user types
export const TITLECASE_FIELDS = new Set([
  "firstName", "lastName", "fatherName", "motherName", "spouseName",
  "placeOfIssue", "placeOfBirth", "memberName", "address"
]);

export const toTitleCase = s => String(s).replace(/\b([a-z])/g, c => c.toUpperCase());

export const NON_PREVIEWABLE = /\.(heic|heif|avif|tiff?|bmp|svg|ico)$/i;
