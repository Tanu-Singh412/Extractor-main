const PASSPORT_COLS = [
    'id', 'docType', 'passportNo', 'firstName', 'lastName', 'surname', 'givenNames',
    'nationality', 'issuingCountry', 'sex', 'dob', 'doe', 'issueDate', 'placeOfBirth', 'placeOfIssue',
    'phone', 'email', 'address', 'fatherName', 'motherName', 'spouseName', 'oldPassportNo', 'fileNo',
    'createdAt'
];

const INSURANCE_COLS = [
    'id', 'docType', 'insuranceType', 'policyNo', 'provider', 'memberName', 'groupNo', 'effectiveDate', 'doe',
    'phone', 'email', 'address', 'healthCardNo', 'tpa', 'networkHospital', 'sumInsured', 'copayPercentage',
    'roomRentLimit', 'hospitalizationLimit', 'waitingPeriod', 'preExistingDisease', 'vehicleNo',
    'registrationNo', 'vehicleType', 'make', 'model', 'variant', 'manufacturingYear', 'chassisNo',
    'engineNo', 'idv', 'ncb', 'fuelType', 'lifeAssured', 'nomineeName', 'maturityDate',
    'deathBenefit', 'maturityBenefit', 'premium', 'policyTermYears', 'travelStartDate',
    'travelEndDate', 'destination', 'departureCountry', 'arrivalCountry', 'tripType',
    'travellerCount', 'createdAt'
];

const ALL_COLS = [
    'id', 'docType', 'passportNo', 'firstName', 'lastName', 'surname', 'givenNames',
    'nationality', 'issuingCountry', 'sex', 'dob', 'doe', 'issueDate', 'placeOfBirth', 'placeOfIssue',
    'phone', 'email', 'address', 'fatherName', 'motherName', 'spouseName', 'oldPassportNo', 'fileNo',
    'insuranceType', 'policyNo', 'provider', 'memberName', 'groupNo', 'effectiveDate',
    'healthCardNo', 'tpa', 'networkHospital', 'sumInsured', 'copayPercentage',
    'roomRentLimit', 'hospitalizationLimit', 'waitingPeriod', 'preExistingDisease', 'vehicleNo',
    'registrationNo', 'vehicleType', 'make', 'model', 'variant', 'manufacturingYear', 'chassisNo',
    'engineNo', 'idv', 'ncb', 'fuelType', 'lifeAssured', 'nomineeName', 'maturityDate',
    'deathBenefit', 'maturityBenefit', 'premium', 'policyTermYears', 'travelStartDate',
    'travelEndDate', 'destination', 'departureCountry', 'arrivalCountry', 'tripType',
    'travellerCount', 'createdAt'
];

function exportCsv(records, docType = 'ALL') {
    let cols = ALL_COLS;
    if (docType === 'PASSPORT') cols = PASSPORT_COLS;
    else if (docType === 'INSURANCE') cols = INSURANCE_COLS;

    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [cols.join(',')].concat(records.map(r => cols.map(c => esc(r[c])).join(',')));
    return rows.join('\n');
}

function exportJson(records) {
    return JSON.stringify(records, null, 2);
}

module.exports = { exportCsv, exportJson, PASSPORT_COLS, INSURANCE_COLS, ALL_COLS };

