const fs = require('fs');
const { OCR_OUTPUT_FILE } = require('../config/paths');
const insurancePatterns = require('../config/insurance-patterns.json');
const { DATE_RE, toISO, firstDateIn } = require('./helpers/dates');
const { titleCase } = require('./helpers/fields');
const { detectInsuranceSubtype, applySubtypePatterns } = require('./helpers/insurance-patterns');

const KNOWN_PROVIDERS = [
    'ORIENTAL INSURANCE', 'NEW INDIA ASSURANCE', 'UNITED INDIA INSURANCE', 'NATIONAL INSURANCE',
    'HDFC ERGO', 'ICICI LOMBARD', 'BAJAJ ALLIANZ', 'TATA AIG', 'STAR HEALTH', 'NIVA BUPA',
    'MAX LIFE', 'SBI LIFE', 'SBI GENERAL', 'RELIANCE GENERAL', 'FUTURE GENERALI', 'IFFCO TOKIO',
    'CHOLA MS', 'GO DIGIT', 'ACKO', 'ALLIANZ', 'AXA', 'METLIFE', 'AETNA', 'CIGNA',
    'BLUE CROSS', 'UNITEDHEALTHCARE', 'KAISER PERMANENTE', 'STATE FARM', 'PROGRESSIVE', 'GEICO', 'LIC'
];

async function parseInsuranceText(rawText) {
    const result = { docType: 'INSURANCE', policyNo: '', provider: '', memberName: '', groupNo: '', effectiveDate: '', dob: '', doe: '' };
    const text = String(rawText || '').replace(/[©®™¢£¥]/g, ' ');
    const upper = text.toUpperCase();
    const lines = text.split(/\r?\n/)
        .map(l => l.replace(/\s+/g, ' ').trim())
        .filter(l => Boolean(l) && !/scanned with|camscanner|adobe scan|oken scanner/i.test(l));

    /* 2) Provider */
    if (!result.provider) {
        for (const line of lines.slice(0, 8)) {
            const U = line.toUpperCase();
            if (/(INSURANCE|ASSURANCE)/.test(U) && U.length < 60) {
                result.provider = titleCase(line.replace(/[^A-Za-z\s&.\-]/g, '').trim());
                break;
            }
        }
    }
    if (!result.provider) {
        for (const p of KNOWN_PROVIDERS) { if (upper.includes(p)) { result.provider = titleCase(p); break; } }
    }

    /* 3) Policy number (reject plain label words like POLICY, truncate before VALID/DATE) */
    const BAD_POLICY_WORDS = new Set(['POLICY', 'NUMBER', 'POLICYNO', 'CERTIFICATE', 'MEMBERSHIP', 'INSURANCE', 'DETAILS', 'STATEMENT', 'NO']);
    if (!result.policyNo) {
        const patterns = [
            /POL(?:IC)?Y\s*(?:NO\.?|NUMBER|N0|NE|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{4,35})/i,
            /POLY\s*(?:NO\.?|N0|NE|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{4,35})/i,
            /CERTIFICATE\s*(?:NO\.?|NUMBER)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{4,35})/i,
            /MEMBERSHIP\s*(?:NO\.?|NUMBER|ID)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{4,35})/i,
            /POLICY\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{5,35})/i,
        ];
        for (const p of patterns) {
            const m = upper.match(p);
            if (m) {
                let rawVal = m[1].split(/(?:VALID|EXPIR|DATE|UNTIL|THRU|EFFECTIVE|FROM|TO|ISSUED|CARD|NAME|PLAN|CODE|PERIOD)/i)[0];
                const v = rawVal.replace(/[^A-Z0-9\-\/]/gi, '');
                if (v.length >= 5 && !BAD_POLICY_WORDS.has(v) && /\d/.test(v)) {
                    result.policyNo = v;
                    break;
                }
            }
        }
    }
    if (!result.policyNo) {
        for (let i = 0; i < lines.length; i++) {
            const U = lines[i].toUpperCase();
            if (/(POLICY|CERTIFICATE|MEMBERSHIP)/.test(U)) {
                const tokens = (U + ' ' + (lines[i+1] || '').toUpperCase())
                    .split(/(?:VALID|EXPIR|DATE|UNTIL|THRU|EFFECTIVE|FROM|TO|ISSUED|CARD|NAME|PLAN|CODE|PERIOD)/i)[0]
                    .replace(/[^A-Z0-9\-\/]/g, ' ')
                    .split(/\s+/)
                    .filter(t => t.length >= 5 && /\d/.test(t) && !BAD_POLICY_WORDS.has(t));
                if (tokens.length) {
                    result.policyNo = tokens[0];
                    break;
                }
            }
        }
    }

    /* 4) Member / insured name (strip 'Name'/'Mr.' & reject company names like Bizdirect) */
    const BAD_MEMBER_NAMES = new Set(['BIZDIRECT', 'LIMITED', 'LTD', 'PVT', 'COMPANY', 'CORPORATION', 'SERVICES', 'HEALTHCARE', 'INSURANCE', 'AGENCY', 'CARD', 'GOVT', 'INDIA', 'NATIONAL', 'OKEN', 'CAMSCANNER', 'ADOBE', 'SCANNER', 'PORTAL', 'SYSTEM', 'DIRECT']);

    const cleanMemberName = (raw) => {
        let v = String(raw || '').replace(/\s+(ISSUE|OFFICE|ADDRESS|CODE|DATE|POLICY|NO\.?).*/i, '').trim();
        for (let loop = 0; loop < 3; loop++) {
            v = v.replace(/^(?:NAME|INSURED|MEMBER|CUSTOMER|POLICY|HOLDER|OF|THE|MR|MRS|MS|DR|MISS|NUMBER)\b[.:\s]*/gi, '').trim();
        }
        const vUpper = v.toUpperCase();
        if (Array.from(BAD_MEMBER_NAMES).some(b => vUpper.includes(b) || vUpper === b)) return '';
        if (/\d/.test(v)) return ''; // Name cannot contain numbers
        return titleCase(v);
    };

    if (!result.memberName) {
        const p = /(?:INSURED\s*NAME|NAME\s*OF\s*(?:THE\s*)?INSURED|MEMBER\s*NAME|CUSTOMER\s*NAME|POLICY\s*HOLDER|POLICYHOLDER|PROPOSER\s*(?:NAME)?|PATIENT\s*(?:NAME)?|BENEFICIARY\s*(?:NAME)?|EMPLOYEE\s*NAME)\s*[:.\-]?\s*([A-Z][A-Z\s.&'\-]{2,48})/i;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const m = line.toUpperCase().match(p);
            if (m) {
                const cleaned = cleanMemberName(m[1]);
                if (cleaned.length >= 3) { result.memberName = cleaned; break; }
            }
            if (/(?:INSURED\s*NAME|MEMBER\s*NAME|POLICY\s*HOLDER|CUSTOMER\s*NAME|PROPOSER|PATIENT)/i.test(line.toUpperCase())) {
                const nextL = lines[i + 1] || '';
                const cleanedNext = cleanMemberName(nextL);
                if (cleanedNext.length >= 3) { result.memberName = cleanedNext; break; }
            }
        }
    }
    if (!result.memberName) {
        for (const line of lines) {
            const m = line.toUpperCase().match(/\bNAME\s*[:.\-]\s*([A-Z][A-Z\s.&'\-]{2,48})/i);
            if (m) {
                const cleaned = cleanMemberName(m[1]);
                if (cleaned.length >= 3) { result.memberName = cleaned; break; }
            }
        }
    }

    /* 5) Group number / insured code */
    if (!result.groupNo) {
        const m = upper.match(/(?:GROUP|GRP)\s*(?:NO\.?|NUMBER|#|ID)\s*[:.\-]?\s*([A-Z0-9\-]{3,20})/i)
            || upper.match(/INSURED\s*CODE\s*[:.\-]?\s*([A-Z0-9\-]{3,20})/i);
        if (m && !BAD_POLICY_WORDS.has(m[1].trim())) result.groupNo = m[1].trim();
    }

    /* 6) Labeled dates */
    for (const line of lines) {
        const U = line.toUpperCase();
        const d = firstDateIn(U);
        if (!d) continue;
        if (!result.dob && /(BIRTH|DOB)/.test(U)) result.dob = d;
        else if (!result.effectiveDate && /(EFFECTIVE|COMMENCEMENT|START|ISSUE|INCEPTION|VALID\s*FROM)/.test(U)) result.effectiveDate = d;
        else if (!result.doe && /(EXPIR|VALID\s*(?:UNTIL|TO|THRU)|TERMINAT|END\s*DATE)/.test(U)) result.doe = d;
    }

    /* 7) "Period: FROM <date> TO <date>" (incl. DDMMYYYY concatenated) */
    if (!result.effectiveDate || !result.doe) {
        for (const line of lines) {
            const U = line.toUpperCase();
            if (!U.includes('FROM') && !U.includes('PERIOD')) continue;
            const found = [];
            for (const m of U.matchAll(DATE_RE)) { const d = toISO(m[0]); if (d) found.push({ iso: d, idx: m.index }); }
            for (const m of U.matchAll(/\b(\d{2})(\d{2})(\d{4})\b/g)) {
                const d = `${m[3]}-${m[2]}-${m[1]}`;
                if (!isNaN(new Date(d).getTime())) found.push({ iso: d, idx: m.index });
            }
            const toIdx = U.indexOf(' TO ');
            found.sort((a, b) => a.idx - b.idx);
            for (const f of found) {
                if (toIdx >= 0 && f.idx < toIdx) { if (!result.effectiveDate) result.effectiveDate = f.iso; }
                else if (!result.doe) result.doe = f.iso;
            }
            if (result.effectiveDate && result.doe) break;
        }
    }
// Apply subtype-specific extraction across ALL types to maximize field capture
let bestSubtype = detectInsuranceSubtype(text);

let matchCounts = { CAR: 0, HEALTH: 0, LIFE: 0, TRAVEL: 0 };

// If a subtype was detected, prioritize its patterns
if (bestSubtype) {
    matchCounts[bestSubtype] = applySubtypePatterns(bestSubtype, text, result);
}

for (const stype of Object.keys(insurancePatterns)) {
    if (stype !== bestSubtype) {
        matchCounts[stype] = applySubtypePatterns(stype, text, result);
    }
}

// If no explicit identifiers found, guess subtype based on most matched fields
if (!bestSubtype) {
    let maxMatches = 0;
    for (const [stype, count] of Object.entries(matchCounts)) {
        if (count > maxMatches && count > 0) {
            maxMatches = count;
            bestSubtype = stype;
        }
    }
}

if (bestSubtype) {
    result.insuranceType = bestSubtype === "CAR" ? "MOTOR" : bestSubtype;
}

    // --- 9) Motor specific fallback for inverted tabular OCR (values before headers) ---
    if (result.insuranceType === 'MOTOR' || bestSubtype === 'CAR') {
        // Check if regexes grabbed garbage headers due to inverted table layout
        if (result.registrationNo && /VEHICLE|MAKE|MODEL|CHASSIS/i.test(result.registrationNo)) result.registrationNo = '';
        if (result.chassisNo && /FUEL|CUBIC/i.test(result.chassisNo)) result.chassisNo = '';
        if (result.make && /MODEL|VARIANT|VEHICLE/i.test(result.make)) result.make = '';
        if (result.fuelType && /CUBIC|CAPACITY/i.test(result.fuelType)) result.fuelType = '';
        if (result.variant && /ABOUT|COVERAGE|PROTECTION/i.test(result.variant)) result.variant = '';
        
        if (result.memberName && /ADDRESS|CONTACT|EMAIL/i.test(result.memberName)) {
            result.memberName = '';
            const nameIdx = lines.findIndex(l => l.toUpperCase() === 'NAME');
            if (nameIdx > 0) {
                const cand = lines[nameIdx - 1];
                if (!cand.includes('@') && !/\d/.test(cand)) result.memberName = titleCase(cand.replace(/^MR\.|MRS\.|MS\./i, '').trim());
            }
        }
        
        // Registration Number
        if (!result.registrationNo) {
            const regMatch = upper.match(/\b([A-Z]{2}\s*[0-9]{1,2}\s*[A-Z]{1,3}\s*[0-9]{4})\b/);
            if (regMatch) result.registrationNo = regMatch[1];
        }
        // Manufacturing Year
        if (!result.manufacturingYear) {
            const linesAbove = lines.slice(0, 40);
            for (const line of linesAbove) {
                const m = line.match(/^([12][0-9]{3})$/);
                if (m) {
                    const y = parseInt(m[1], 10);
                    if (y >= 1990 && y <= new Date().getFullYear()) {
                        result.manufacturingYear = m[1];
                        break;
                    }
                }
            }
        }
        // Fuel Type
        if (!result.fuelType) {
            const fuelMatch = upper.match(/\b(PETROL|DIESEL|CNG|LPG|EV|ELECTRIC)\b/);
            if (fuelMatch) result.fuelType = titleCase(fuelMatch[1]);
        }
        // Engine & Chassis Number
        if (!result.engineNo && !result.chassisNo) {
            for (let i = 0; i < lines.length; i++) {
                const combined = (lines[i] + ' ' + (lines[i+1] || '')).toUpperCase();
                const ecMatch = combined.match(/([A-Z0-9]{5,20})\s*&\s*([A-Z0-9]{5,20})/);
                if (ecMatch && /[A-Z]/.test(ecMatch[1]) && /\d/.test(ecMatch[1])) {
                    result.engineNo = ecMatch[1];
                    result.chassisNo = ecMatch[2];
                    break;
                }
            }
        }
        // Make, Model, Variant
        if (!result.make || !result.model) {
            const makes = ['HONDA', 'MARUTI', 'HYUNDAI', 'TATA', 'MAHINDRA', 'TOYOTA', 'KIA', 'BAJAJ', 'HERO', 'TVS', 'ROYAL ENFIELD', 'YAMAHA', 'SUZUKI', 'CHEVROLET', 'FORD', 'VOLKSWAGEN', 'SKODA', 'RENAULT', 'NISSAN'];
            for (let i = 0; i < lines.length; i++) {
                const upLine = lines[i].toUpperCase();
                const foundMake = makes.find(m => upLine.includes(m));
                if (foundMake) {
                    result.make = titleCase(foundMake);
                    let modelStr = upLine.replace(foundMake, '').trim();
                    if (lines[i+1] && !/RTO|LOCATION|SEATING|CAPACITY|ENGINE|CHASSIS|NUMBER|FUEL|CUBIC|MANUFACTURING|YEAR|REGISTRATION|VEHICLE|MAKE|MODEL|VARIANT/i.test(lines[i+1])) {
                        modelStr += ' ' + lines[i+1].trim();
                    }
                    modelStr = modelStr.replace(/^[,&\\-\\s]+/, '').replace(/MOTORCYCLES?,?\\s*/i, '');
                    if (modelStr) {
                        const parts = modelStr.split(/&|,/);
                        result.model = titleCase(parts[0].trim());
                        if (parts.length > 1) result.variant = titleCase(parts.slice(1).join(' ').trim());
                    }
                    break;
                }
            }
        }
    }

    /* 7a) Contact details fallback (phone, email, address) */
    if (!result.phone) {
        const phoneMatch = text.match(/(?:Ph|Phone|Mobile|Contact|Tel|Mob)\s*[:.\-]?\s*(\+?\d{1,3}[-\s]?\d{4,14})/i);
        if (phoneMatch) result.phone = phoneMatch[1].trim();
    }
    if (!result.email) {
        const emailMatch = text.match(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/);
        if (emailMatch) result.email = emailMatch[1].trim();
    }
    if (!result.address) {
        const addressMatch = text.match(/(?:Address|Add)\s*[:.\-]\s*([^\n]+(?:\n[^\n]+){0,2})/i);
        if (addressMatch) {
            const addLines = addressMatch[1].split('\n').filter(l => l.trim() && !/(?:Phone|Email|Policy|Date|Name|Premium)/i.test(l));
            result.address = addLines.join(', ').trim();
        }
    }

fs.writeFileSync(OCR_OUTPUT_FILE, text);
console.log('[PARSER] Insurance result:', JSON.stringify(result, null, 2));
    /* 7b) Date Fallback for Insurance */
    if (!result.effectiveDate || !result.doe) {
        const dates = [];
        for (const line of lines) {
            for (const m of line.toUpperCase().matchAll(DATE_RE)) {
                const d = toISO(m[0]);
                if (d && !dates.includes(d) && d !== result.dob) dates.push(d);
            }
        }
        dates.sort();
        if (dates.length >= 2) {
            if (!result.effectiveDate) result.effectiveDate = dates[0];
            if (!result.doe) result.doe = dates[dates.length - 1];
        } else if (dates.length === 1) {
            if (!result.effectiveDate) result.effectiveDate = dates[0];
        }
    }

    /* 8) Normalize + sanity */
    result.dob = toISO(result.dob);
    result.effectiveDate = toISO(result.effectiveDate);
    result.doe = toISO(result.doe);
    if (result.effectiveDate && result.doe && result.effectiveDate > result.doe) {
        const t = result.effectiveDate; result.effectiveDate = result.doe; result.doe = t;
    }
    result.memberName = titleCase(result.memberName);
    const nameTokens = result.memberName ? result.memberName.split(/\s+/) : [];
    result.firstName = nameTokens[0] || '';
    result.lastName = nameTokens.slice(1).join(' ') || '';
    console.log('[PARSER] Insurance result:', JSON  .stringify(result, null, 2));
    return result;
}

module.exports = { parseInsuranceText };
