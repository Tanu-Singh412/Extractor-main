const insurancePatterns = require('../../config/insurance-patterns.json');

function detectInsuranceSubtype(text) {
const upper = text.toUpperCase();
for (const [subtype, cfg] of Object.entries(insurancePatterns)) {
    if (cfg.identifiers && Array.isArray(cfg.identifiers)) {
    for (const id of cfg.identifiers) {
        if (new RegExp(id, 'i').test(upper)) return subtype;
    }
    }
}
return null;
}

// Apply subtype-specific regexes to extract fields and return match count
function applySubtypePatterns(subtype, text, result) {
    const cfg = insurancePatterns[subtype];
    if (!cfg) return 0;
    const upper = text.toUpperCase();
    let matchCount = 0;
    for (const [field, pattern] of Object.entries(cfg)) {
        if (field === 'identifiers') continue;
        if (result[field]) continue; // preserve earlier value
        try {
            const regex = new RegExp(pattern, 'i');
            const m = upper.match(regex);
            if (m && m[1]) {
                const val = m[1].trim();
                const valUpper = val.toUpperCase();
                // Filter out obvious header/label noise
                if (['NUMBER', 'VEHICLE', 'MAKE', 'MODEL', 'VARIANT', 'ABOUT YOUR VEHICLE', 'DETAILS'].includes(valUpper)) continue;
                if ((field === 'engineNo' || field === 'chassisNo') && (!/\d/.test(val) || !/[A-Za-z]/.test(val) || val.length < 5)) continue;
                if ((field === 'registrationNo' || field === 'vehicleNo') && (!/\d/.test(val) || !/[A-Za-z]/.test(val))) continue;
                if (field === 'policyNo' && /STAMP|ORDER|VIDE|DUTY|RECEIPT|INVOICE|GSTIN/i.test(val)) continue;
                if (field === 'fuelType' && !/^(?:PETROL|DIESEL|CNG(?:\s*\/\s*LPG)?|LPG|EV|ELECTRIC|HYBRID)$/i.test(val)) continue;

                result[field] = val;
                matchCount++;
            }
        } catch (e) {
            console.warn(`[PARSER] Invalid regex for ${field} of ${subtype}:`, e.message);
        }
    }
    return matchCount;
}

module.exports = { detectInsuranceSubtype, applySubtypePatterns };
