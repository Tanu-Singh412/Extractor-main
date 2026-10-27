const { toISO } = require('../helpers/dates');
const { titleCase } = require('../helpers/fields');
const { normCountry } = require('../helpers/countries');

function normalizePassportFields(result, lines) {
    result.nationality = normCountry(result.nationality);
    result.issuingCountry = normCountry(result.issuingCountry) || result.nationality;
    result.sex = /^(M|MALE)/i.test(result.sex || '') ? 'M' : /^(F|FEMALE)/i.test(result.sex || '') ? 'F'
        : /^(X|OTHER)/i.test(result.sex || '') ? 'X' : '';
    result.dob = toISO(result.dob);
    // FirstName fallback now handled later in the code (lines 608-618)
    result.doe = toISO(result.doe);
    result.issueDate = toISO(result.issueDate);

    // Fallback: If passport number is still missing, look for a repeating 8-10 digit/char token (very common for passport numbers at the top and bottom of the visual zone)
    if (!result.passportNo) {
        const tokenCounts = {};
        for (const line of lines) {
            const toks = line.toUpperCase().split(/[^A-Z0-9]+/).filter(t => t.length >= 7 && t.length <= 11 && /\d/.test(t) && !/^\d{8}$/.test(t) /* exclude dates */);
            for (const t of toks) {
                tokenCounts[t] = (tokenCounts[t] || 0) + 1;
            }
        }
        const repeated = Object.keys(tokenCounts).filter(k => tokenCounts[k] >= 2);
        if (repeated.length > 0) {
            result.passportNo = repeated[0];
            console.log(`[PARSER] Passport No extracted via frequency fallback: ${result.passportNo}`);
        } else {
            // Last resort: find any isolated 8-10 alnum token with digits on the last few lines or first few lines
            const candLines = [...lines.slice(0, 3), ...lines.slice(-3)];
            for (const line of candLines) {
                const toks = line.toUpperCase().split(/[^A-Z0-9]+/).filter(t => t.length >= 7 && t.length <= 11 && /\d/.test(t) && !/^\d{8}$/.test(t));
                if (toks.length > 0) {
                    result.passportNo = toks[toks.length - 1];
                    console.log(`[PARSER] Passport No extracted via edge-line fallback: ${result.passportNo}`);
                    break;
                }
            }
        }
    }

    // If issueDate is still empty but we have DOB and DOE, guess a plausible issue date (midpoint)
    if (!result.issueDate && result.dob && result.doe) {
        const diff = new Date(result.doe) - new Date(result.dob);
        if (!isNaN(diff) && diff > 0) {
            const midMs = new Date(result.dob).getTime() + diff / 2;
            const midDate = new Date(midMs);
            const isoMid = `${midDate.getUTCFullYear()}-${String(midDate.getUTCMonth() + 1).padStart(2, '0')}-${String(midDate.getUTCDate()).padStart(2, '0')}`;
            result.issueDate = isoMid;
        }
    }
    const today = new Date().toISOString().slice(0, 10);
    if (result.dob && result.dob > today) result.dob = '';
    if (result.dob && result.doe && result.doe < result.dob) { const t = result.dob; result.dob = result.doe; result.doe = t; }
    if (result.issueDate && result.doe && result.issueDate > result.doe) { const t = result.issueDate; result.issueDate = result.doe; result.doe = t; }
    if (result.issueDate && result.dob && result.issueDate < result.dob) result.issueDate = '';

    // Fallback nationality: if still empty, look for country keywords in raw lines
    if (!result.nationality) {
        for (const line of lines) {
            const m = line.match(/\b([A-Z]{3,})\b/);
            if (m) {
                const code = normCountry(m[1]);
                if (code) { result.nationality = code; break; }
            }
        }
    }
    // Fallback sex: look for common words or single letters M/F
    if (!result.sex) {
        for (const line of lines) {
            const up = line.toUpperCase();
            if (/(MALE|FEMALE)/.test(up)) {
                result.sex = up.includes('FEMALE') ? 'F' : 'M';
                break;
            }
            const sexMatch = up.match(/\b(M|F)\b/);
            if (sexMatch) { result.sex = sexMatch[1]; break; }
        }
    }
    // Ensure firstName is populated; fall back to surname if givenNames missing
    if (!result.firstName) {
        if (result.givenNames) {
            result.firstName = result.givenNames.split(' ')[0] || result.givenNames;
        } else if (result.surname) {
            result.firstName = result.surname.split(' ')[0];
        }
    }
    // Ensure lastName reflects surname when not already set
    if (!result.lastName && result.surname) {
        result.lastName = result.surname;
    }
    // Title-case name fields for consistency
    if (result.firstName) result.firstName = titleCase(result.firstName);
    if (result.lastName) result.lastName = titleCase(result.lastName);
    if (result.givenNames) result.givenNames = result.givenNames.split(' ').map(w => titleCase(w)).join(' ');
    if (result.surname) result.surname = result.surname.split(' ').map(w => titleCase(w)).join(' ');
}

module.exports = { normalizePassportFields };
