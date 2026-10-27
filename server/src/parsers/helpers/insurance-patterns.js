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
                result[field] = m[1].trim();
                matchCount++;
            }
        } catch (e) {
            console.warn(`[PARSER] Invalid regex for ${field} of ${subtype}:`, e.message);
        }
    }
    return matchCount;
}

module.exports = { detectInsuranceSubtype, applySubtypePatterns };
