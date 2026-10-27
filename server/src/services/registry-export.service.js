function exportCsv(records) {
const cols = ['id', 'docType', 'passportNo', 'firstName', 'lastName', 'surname', 'givenNames',
        'nationality', 'issuingCountry', 'sex', 'dob', 'doe', 'issueDate', 'placeOfBirth', 'placeOfIssue',
        'address', 'fatherName', 'motherName', 'spouseName', 'oldPassportNo', 'fileNo',
        'insuranceType', 'policyNo', 'provider', 'memberName', 'groupNo', 'effectiveDate',
        'phone', 'email', 'healthCardNo', 'tpa', 'networkHospital', 'sumInsured', 'copayPercentage',
        'roomRentLimit', 'hospitalizationLimit', 'waitingPeriod', 'preExistingDisease', 'vehicleNo',
        'registrationNo', 'vehicleType', 'make', 'model', 'variant', 'manufacturingYear', 'chassisNo',
        'engineNo', 'idv', 'ncb', 'fuelType', 'lifeAssured', 'nomineeName', 'maturityDate',
        'deathBenefit', 'maturityBenefit', 'premium', 'policyTermYears', 'travelStartDate',
        'travelEndDate', 'destination', 'departureCountry', 'arrivalCountry', 'tripType',
        'travellerCount', 'createdAt'];
    const esc = (v) => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const rows = [cols.join(',')].concat(records.map(r => cols.map(c => esc(r[c])).join(',')));
    return rows.join('\n');
}

function exportJson(records) {
    return JSON.stringify(records, null, 2);
}

module.exports = { exportCsv, exportJson };
