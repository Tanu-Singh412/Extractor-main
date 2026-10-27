const { cleanRelativeName } = require('./helpers/fields');
const { extractMRZ } = require('./mrz.parser');
const { extractVisualFields } = require('./passport/visual-fields');
const { applyFieldFallbacks } = require('./passport/field-fallbacks');
const { resolvePassportNames } = require('./passport/name-resolution');
const { normalizePassportFields } = require('./passport/normalization');
const { extractSupplementalFields } = require('./passport/supplemental-fields');

async function parsePassportText(rawText) {
    const result = {
        docType: 'PASSPORT',
        passportNo: '', surname: '', givenNames: '', lastName: '', firstName: '',
        nationality: '', sex: '', dob: '', doe: '', issueDate: '', issuingCountry: '', address: '',
        fatherName: '', motherName: '', spouseName: '', oldPassportNo: '', placeOfIssue: '', fileNo: '', placeOfBirth: ''
    };
    const text = String(rawText || '');

    /* --- 1) MRZ --- */
    const mrz = extractMRZ(text);
    if (mrz) {
        console.log(`[PARSER] MRZ score=${mrz.score} valid=${mrz.valid} pn=${mrz.passportNo} name=${mrz.surname}/${mrz.givenNames}`);
        result.passportNo = mrz.passportNo || '';
        result.surname = mrz.surname || '';
        result.givenNames = mrz.givenNames || '';
        result.issuingCountry = mrz.issuingCountry || '';
        result.nationality = mrz.nationality || '';
        result.dob = mrz.dob || '';
        result.doe = mrz.expiry || '';
        result.sex = mrz.sex || '';
    } else {
        console.log('[PARSER] No validated MRZ — visual zone will be used');
    }

    const context = extractVisualFields(result, text);
    applyFieldFallbacks(result, rawText, context);

    // Clean trailing OCR garbage from family name fields
    if (result.fatherName) result.fatherName = cleanRelativeName(result.fatherName);
    if (result.motherName) result.motherName = cleanRelativeName(result.motherName);
    if (result.spouseName) result.spouseName = cleanRelativeName(result.spouseName);

    resolvePassportNames(result, text, context);
    normalizePassportFields(result, context.lines);
    extractSupplementalFields(result, context.lines, context.extraFields);

    console.log('[PARSER] Passport result:', JSON.stringify(result, null, 2));
    return result;
}

module.exports = { parsePassportText };
