const fs = require('fs');
const { OCR_OUTPUT_FILE } = require('../config/paths');
const insurancePatterns = require('../config/insurance-patterns.json');
const { DATE_RE, toISO, firstDateIn, allDatesIn } = require('./helpers/dates');
const { titleCase } = require('./helpers/fields');
const { detectInsuranceSubtype, applySubtypePatterns } = require('./helpers/insurance-patterns');

const KNOWN_PROVIDERS = [
    'ORIENTAL INSURANCE', 'NEW INDIA ASSURANCE', 'UNITED INDIA INSURANCE', 'NATIONAL INSURANCE',
    'HDFC ERGO', 'ICICI LOMBARD', 'BAJAJ ALLIANZ', 'TATA AIG', 'STAR HEALTH', 'NIVA BUPA',
    'CARE HEALTH', 'MANIPAL CIGNA', 'ADITYA BIRLA', 'MAX LIFE', 'SBI LIFE', 'SBI GENERAL',
    'HDFC LIFE', 'ICICI PRUDENTIAL', 'RELIANCE GENERAL', 'FUTURE GENERALI', 'IFFCO TOKIO',
    'CHOLA MS', 'GO DIGIT', 'DIGIT INSURANCE', 'ACKO', 'MAGMA HDI', 'KOTAK GENERAL', 'SHRIRAM GENERAL',
    'ZURICH KOTAK', 'LIBERTY GENERAL', 'UNIVERSAL SOMPO', 'RAHEJA QBE', 'ROYAL SUNDARAM', 'EDELWEISS',
    'NAVI GENERAL', 'BHARTI AXA', 'ALLIANZ', 'AXA', 'METLIFE', 'AETNA', 'CIGNA',
    'BLUE CROSS', 'UNITEDHEALTHCARE', 'KAISER PERMANENTE', 'STATE FARM', 'PROGRESSIVE', 'GEICO', 'LIC'
];

const BAD_POLICY_WORDS = new Set([
    'POLICY', 'NUMBER', 'POLICYNO', 'CERTIFICATE', 'MEMBERSHIP', 'INSURANCE', 'DETAILS',
    'STATEMENT', 'SCHEDULE', 'DOCUMENT', 'NO', 'NUM', 'TYPE', 'FORM', 'PERIOD', 'DATE',
    'STAMPS', 'STAMP', 'ORDER', 'VIDE', 'DUTY', 'CONSOLIDATED', 'RECEIPT', 'INVOICE', 'GSTIN'
]);

const BAD_MEMBER_NAMES = new Set([
    'BIZDIRECT', 'LIMITED', 'LTD', 'PVT', 'COMPANY', 'CORPORATION', 'SERVICES', 'HEALTHCARE',
    'INSURANCE', 'AGENCY', 'CARD', 'GOVT', 'INDIA', 'NATIONAL', 'OKEN', 'CAMSCANNER', 'ADOBE',
    'SCANNER', 'PORTAL', 'SYSTEM', 'DIRECT', 'BRANCH', 'OFFICE', 'ADDRESS', 'POLICY', 'HOLDER',
    'VEHICLE', 'CUSTOMER', 'PREMIUM', 'SCHEDULE', 'CERTIFICATE', 'INSPECTION'
]);

function cleanMemberName(raw) {
    if (!raw) return '';
    let v = String(raw).replace(/\s+(ISSUE|OFFICE|ADDRESS|CODE|DATE|POLICY|NO\.?|DOB|AGE|GENDER|SEX|PHONE|MOBILE|EMAIL).*/i, '').trim();
    // Strip common salutations and label words
    for (let loop = 0; loop < 4; loop++) {
        v = v.replace(/^(?:NAME\s*OF\s*(?:THE\s*)?(?:INSURED|POLICY\s*HOLDER|PROPOSER|CUSTOMER|MEMBER)?|INSURED|MEMBER|CUSTOMER|POLICY|HOLDER|PROPOSER|PATIENT|OF|THE|MR|MRS|MS|DR|SHRI|SMT|MISS|MASTER|M\/S|NUMBER)\b[.:\s\-]*/gi, '').trim();
    }
    v = v.replace(/[^A-Za-z\s.'\-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (v.length < 3 || v.length > 55) return '';
    const vUpper = v.toUpperCase();
    if (Array.from(BAD_MEMBER_NAMES).some(b => vUpper.includes(b) || vUpper === b)) return '';
    if (/\d/.test(v)) return ''; // Name cannot contain numbers
    return titleCase(v);
}

function cleanPolicyNumber(raw) {
    if (!raw) return '';
    // Only look at the current line
    let v = String(raw).split(/\r?\n/)[0];
    // Strip trailing keywords like VALID, EXPIRY, DATE, PERIOD, NAME, MEMBER, STAMP, ORDER
    v = v.split(/(?:VALID|EXPIR|DATE|UNTIL|THRU|EFFECTIVE|FROM|TO|ISSUED|CARD|NAME|PLAN|CODE|PERIOD|PREMIUM|MEMBER|INSURED|PROPOSER|HOLDER|CUSTOMER|STAMP|ORDER|VIDE|DUTY|RECEIPT|INVOICE)/i)[0];
    // Remove characters that aren't alphanumeric or hyphen/slash
    v = v.replace(/[^A-Za-z0-9\-\/]/g, '').trim().toUpperCase();
    // Collapse duplicate dashes or slashes
    v = v.replace(/-{2,}/g, '-').replace(/\/{2,}/g, '/');
    if (v.length < 5 || v.length > 40) return '';
    if (BAD_POLICY_WORDS.has(v)) return '';
    // Reject strings that are actually stamp/order/vide/duty/receipt numbers
    if (/STAMP|ORDER|VIDE|DUTY|RECEIPT|INVOICE|GSTIN|CIN|IRDAI/i.test(v)) return '';
    // Policy numbers must contain at least one digit
    if (!/\d/.test(v)) return '';
    return v;
}


async function parseInsuranceText(rawText) {
    const result = {
        docType: 'INSURANCE',
        policyNo: '',
        provider: '',
        memberName: '',
        groupNo: '',
        effectiveDate: '',
        dob: '',
        doe: '',
        phone: '',
        email: '',
        address: ''
    };

    const text = String(rawText || '').replace(/[©®™¢£¥]/g, ' ');
    const upper = text.toUpperCase();
    const lines = text.split(/\r?\n/)
        .map(l => l.replace(/\s+/g, ' ').trim())
        .filter(l => Boolean(l) && !/scanned with|camscanner|adobe scan|oken scanner/i.test(l));

    /* 1) Provider Detection */
    for (const p of KNOWN_PROVIDERS) {
        if (upper.includes(p)) {
            result.provider = titleCase(p);
            break;
        }
    }
    if (!result.provider) {
        for (const line of lines.slice(0, 10)) {
            const U = line.toUpperCase();
            if (/(INSURANCE|ASSURANCE)/.test(U) && U.length < 65) {
                // Avoid capturing generic headers
                if (!/CERTIFICATE\s*OF|SCHEDULE\s*OF|POLICY\s*SCHEDULE|WELCOME\s*TO|MOTOR\s*VEHICLE\s*INSURANCE/i.test(U)) {
                    result.provider = titleCase(line.replace(/[^A-Za-z\s&.\-]/g, '').trim());
                    break;
                }
            }
        }
    }

    /* 2) Policy number */
    // Multi-line chunk scanning (handles tabular/grid where "Policy / Certificate \n No \n : <candidate>")
    for (let i = 0; i < lines.length; i++) {
        const chunk = (lines[i] + ' ' + (lines[i + 1] || '') + ' ' + (lines[i + 2] || '')).toUpperCase();
        // 1. Direct "Policy Number POPM..." or "Policy / Certificate No : POPM..."
        const m = chunk.match(/(?:POLICY\s*(?:\/|\&)?\s*CERTIFICATE|POLICY|CERTIFICATE)\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*([A-Z0-9][A-Z0-9\/\-]{5,35})\b/i);
        if (m) {
            const cand = cleanPolicyNumber(m[1]);
            if (cand) {
                result.policyNo = cand;
                break;
            }
        }
        // 2. "Policy POPM... is issued"
        const m2 = chunk.match(/\bPOLICY\s+([A-Z0-9][A-Z0-9\/\-]{6,35})\s+IS\s+ISSUED\b/i);
        if (m2) {
            const cand = cleanPolicyNumber(m2[1]);
            if (cand) {
                result.policyNo = cand;
                break;
            }
        }
    }

    if (!result.policyNo) {
        const policyPatterns = [
            /(?:POL(?:IC)?Y\s*(?:\/|\&)?\s*CERT(?:IFICATE)?|CERT(?:IFICATE)?\s*(?:\/|\&)?\s*POL(?:IC)?Y|POL(?:IC)?Y|CERT(?:IFICATE)?|SCHEDULE|COVER\s*NOTE|PROPOSAL)\s*(?:\/|\s)*(?:NO\.?|NUMBER|NUM|#|N[O0]|NE)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 \t\/\.-]{3,40})/i,
            /POLICY\s*(?:IDENTIFIER|ID|REF(?:ERENCE)?)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 \t\/\.-]{3,40})/i,
            /CERTIFICATE\s*(?:OF\s*INSURANCE)?\s*(?:NO\.?|NUMBER|#)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 \t\/\.-]{3,40})/i,
            /MEMBERSHIP\s*(?:NO\.?|NUMBER|ID)\s*[:.\-]?\s*([A-Z0-9][A-Z0-9 \t\/\.-]{3,40})/i,
        ];

        for (const p of policyPatterns) {
            const m = upper.match(p);
            if (m) {
                const candidate = cleanPolicyNumber(m[1]);
                if (candidate) {
                    result.policyNo = candidate;
                    break;
                }
            }
        }
    }

    // Line-by-line / Tabular layout fallback for policy number
    if (!result.policyNo) {
        for (let i = 0; i < lines.length; i++) {
            const U = lines[i].toUpperCase();
            const labelMatch = U.match(/(?:POL(?:IC)?Y\s*(?:\/|\&)?\s*CERT(?:IFICATE)?|POLICY|CERTIFICATE|SCHEDULE|COVER\s*NOTE|PROPOSAL)\s*(?:NO\.?|NUMBER|#)\s*[:.\-]?\s*([A-Z0-9 \t\/\.-]{4,})/i);
            if (labelMatch) {
                const lineCandidate = cleanPolicyNumber(labelMatch[1]);
                if (lineCandidate) {
                    result.policyNo = lineCandidate;
                    break;
                }
            } else if (/(?:POLICY|CERTIFICATE|SCHEDULE|COVER\s*NOTE|PROPOSAL)\s*(?:NO\.?|NUMBER|#)/i.test(U) && lines[i + 1]) {
                const nextTokens = lines[i + 1].toUpperCase().split(/\s+/);
                for (const tok of nextTokens) {
                    const cleanedTok = cleanPolicyNumber(tok);
                    if (cleanedTok) {
                        result.policyNo = cleanedTok;
                        break;
                    }
                }
                if (result.policyNo) break;
            }
        }
    }

    /* 3) Member / insured name */
    const namePatterns = [
        /(?:NAME\s*OF\s*(?:THE\s*)?(?:INSURED|POLICY\s*HOLDER|PROPOSER|CUSTOMER|MEMBER|OWNER)|(?:INSURED|POLICY\s*HOLDER|PROPOSER|CUSTOMER|MEMBER|PATIENT|OWNER|CLIENT)(?:'S)?\s*NAME|BENEFICIARY\s*NAME)\s*[:.\-]?\s*(?:MR\.?|MRS\.?|MS\.?|DR\.?|SHRI\.?|SMT\.?|M\/S\.?)?\s*([A-Za-z][A-Za-z\s.&'\-]{2,50})/i,
        /(?:POLICY\s*HOLDER|INSURED\s*PERSON|PROPOSER)\s*[:.\-]?\s*(?:MR\.?|MRS\.?|MS\.?|DR\.?|SHRI\.?|SMT\.?|M\/S\.?)?\s*([A-Za-z][A-Za-z\s.&'\-]{2,50})/i,
        /\b(?:DEAR\s+)?(?:MR|MRS|MS|DR|SHRI|SMT)\.?\s*([A-Z][A-Za-z\s.&'\-]{2,45})\b/i,
    ];

    for (const p of namePatterns) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const m = line.match(p);
            if (m) {
                const cleaned = cleanMemberName(m[1]);
                if (cleaned) {
                    result.memberName = cleaned;
                    break;
                }
            }
            // Check tabular next-line name
            if (/(?:NAME\s*OF\s*(?:THE\s*)?INSURED|INSURED\s*NAME|POLICY\s*HOLDER\s*NAME|PROPOSER\s*NAME)/i.test(line.toUpperCase())) {
                if (lines[i + 1]) {
                    const cleanedNext = cleanMemberName(lines[i + 1]);
                    if (cleanedNext) {
                        result.memberName = cleanedNext;
                        break;
                    }
                }
            }
        }
        if (result.memberName) break;
    }

    // Name above Communication/Proposer Address block
    if (!result.memberName) {
        for (let i = 0; i < lines.length; i++) {
            if (/(?:COMMUNICATION\s*ADDRESS|CORRESPONDENCE\s*ADDRESS|PROPOSER\s*ADDRESS)/i.test(lines[i])) {
                for (let k = 1; k <= 3; k++) {
                    if (lines[i - k]) {
                        const cand = cleanMemberName(lines[i - k]);
                        if (cand) {
                            result.memberName = cand;
                            break;
                        }
                    }
                }
                if (result.memberName) break;
            }
        }
    }

    // Generic name line fallback
    if (!result.memberName) {
        for (const line of lines) {
            const m = line.match(/\bNAME\s*[:.\-]\s*([A-Za-z][A-Za-z\s.&'\-]{2,50})/i);
            if (m) {
                const cleaned = cleanMemberName(m[1]);
                if (cleaned) {
                    result.memberName = cleaned;
                    break;
                }
            }
        }
    }

    /* 4) Validity Dates (Period of Insurance, Effective Date & Expiry Date) */
    // A. Check Period of Insurance / Policy Period line and its immediate continuation
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toUpperCase();
        if (/(?:PERIOD\s*OF\s*INSURANCE|POLICY\s*PERIOD|COVER\s*PERIOD|RISK\s*PERIOD|VALIDITY\s*PERIOD)/.test(line)) {
            const forwardText = (lines[i] + ' ' + (lines[i + 1] || '') + ' ' + (lines[i + 2] || '')).toUpperCase();
            const fromMatch = forwardText.match(/FROM\s*[:.\-]?\s*([0-9A-Za-z/., \t\-]+?)(?:TO|UNTIL|\bHR|\bMIDNIGHT|\n|$)/i);
            const toMatch = forwardText.match(/(?:TO|UNTIL)\s*[:.\-]?\s*([0-9A-Za-z/., \t\-]+)/i);
            const fromD = fromMatch ? firstDateIn(fromMatch[1]) : null;
            const toD = toMatch ? firstDateIn(toMatch[1]) : null;
            if (fromD && toD) {
                result.effectiveDate = fromD;
                result.doe = toD;
                break;
            } else {
                const wDates = allDatesIn(forwardText);
                if (wDates.length >= 2) {
                    result.effectiveDate = wDates[0];
                    result.doe = wDates[wDates.length - 1];
                    break;
                }
            }
        }
    }

    // B. Check "FROM ... TO ..." line or two consecutive lines
    if (!result.effectiveDate || !result.doe) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toUpperCase();
            if (line.includes('FROM') && (line.includes('TO') || line.includes('UNTIL'))) {
                const lineDates = allDatesIn(line);
                if (lineDates.length >= 2) {
                    if (!result.effectiveDate) result.effectiveDate = lineDates[0];
                    if (!result.doe) result.doe = lineDates[lineDates.length - 1];
                    break;
                }
            } else if (line.includes('FROM') && (lines[i + 1] || '').toUpperCase().includes('TO')) {
                const forwardText = (lines[i] + ' ' + lines[i + 1]).toUpperCase();
                const forwardDates = allDatesIn(forwardText);
                if (forwardDates.length >= 2) {
                    if (!result.effectiveDate) result.effectiveDate = forwardDates[0];
                    if (!result.doe) result.doe = forwardDates[forwardDates.length - 1];
                    break;
                }
            }
        }
    }

    // C. Line-by-line label matching (Prioritizing explicit Start/Commencement/Expiry over Issue Date)
    for (const line of lines) {
        const U = line.toUpperCase();
        const d = firstDateIn(U);
        if (!d) continue;

        if (!result.dob && /(?:BIRTH|DOB)/.test(U)) {
            result.dob = d;
        } else if (!result.effectiveDate && /(?:POLICY\s*START\s*DATE|EFFECTIVE\s*DATE|COMMENCEMENT\s*DATE|START\s*DATE|INCEPTION\s*DATE|VALID\s*FROM)/.test(U)) {
            result.effectiveDate = d;
        } else if (!result.doe && /(?:POLICY\s*END\s*DATE|EXPIR|VALID\s*(?:UNTIL|TO|THRU)|TERMINAT|END\s*DATE|MATURITY)/.test(U)) {
            result.doe = d;
        }
    }

    // Fallback to Issue Date only if effectiveDate is still missing
    if (!result.effectiveDate) {
        for (const line of lines) {
            const U = line.toUpperCase();
            if (/(?:ISSUE\s*DATE|ISSUANCE\s*DATE)/.test(U)) {
                const d = firstDateIn(U);
                if (d) { result.effectiveDate = d; break; }
            }
        }
    }

    // D. Global date sequence fallback if still missing
    if (!result.effectiveDate || !result.doe) {
        const allDocDates = allDatesIn(text).filter(d => d !== result.dob);
        allDocDates.sort();
        if (allDocDates.length >= 2) {
            if (!result.effectiveDate) result.effectiveDate = allDocDates[0];
            if (!result.doe) result.doe = allDocDates[allDocDates.length - 1];
        } else if (allDocDates.length === 1 && !result.effectiveDate) {
            result.effectiveDate = allDocDates[0];
        }
    }

    /* 5) Group number / insured code */
    if (!result.groupNo) {
        const m = upper.match(/(?:GROUP|GRP)\s*(?:NO\.?|NUMBER|#|ID)\s*[:.\-]?\s*([A-Z0-9\-]{3,20})/i)
            || upper.match(/INSURED\s*CODE\s*[:.\-]?\s*([A-Z0-9\-]{3,20})/i);
        if (m && !BAD_POLICY_WORDS.has(m[1].trim())) result.groupNo = m[1].trim();
    }

    /* 6) Subtype detection & extraction (Motor, Health, Life, Travel) */
    let bestSubtype = detectInsuranceSubtype(text);
    let matchCounts = { CAR: 0, HEALTH: 0, LIFE: 0, TRAVEL: 0 };

    if (bestSubtype) {
        matchCounts[bestSubtype] = applySubtypePatterns(bestSubtype, text, result);
        result.insuranceType = bestSubtype === 'CAR' ? 'MOTOR' : bestSubtype;
    } else {
        for (const stype of Object.keys(insurancePatterns)) {
            matchCounts[stype] = applySubtypePatterns(stype, text, result);
        }
        let maxMatches = 0;
        for (const [stype, count] of Object.entries(matchCounts)) {
            if (count > maxMatches && count > 0) {
                maxMatches = count;
                bestSubtype = stype;
            }
        }
        if (bestSubtype) {
            result.insuranceType = bestSubtype === 'CAR' ? 'MOTOR' : bestSubtype;
        }
    }

    /* 7) Motor Specific Robust Fallbacks */
    if (result.insuranceType === 'MOTOR' || bestSubtype === 'CAR' || /VEHICLE|MOTOR|CHASSIS|ENGINE/i.test(text)) {
        result.insuranceType = 'MOTOR';

        // 1. Structured table scanning (e.g. "YOUR VEHICLE DETAILS" line by line)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const U = line.toUpperCase();

            // Registration Number
            if (/REGISTRATION\s*(?:NUMBER|NO\.?)/i.test(U)) {
                const m = line.match(/REGISTRATION\s*(?:NUMBER|NO\.?)\s*[:.\-]?\s*([A-Z0-9\s\-]+)/i);
                if (m && m[1]) {
                    const rawReg = m[1].trim().replace(/\s+/g, ' ').toUpperCase();
                    const compactReg = rawReg.replace(/[^A-Z0-9]/gi, '');
                    if (/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$/.test(compactReg) || /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/.test(compactReg)) {
                        result.registrationNo = rawReg;
                    }
                }
            }

            // Engine Number
            if (/\bENGINE\s*(?:NUMBER|NO\.?)/i.test(U) && !/CHASSIS/i.test(U)) {
                const m = line.match(/\bENGINE\s*(?:NUMBER|NO\.?)\s*[:.\-]?\s*([A-Z0-9\-]+)/i);
                if (m && m[1] && /[A-Z]/.test(m[1]) && /\d/.test(m[1]) && m[1].length >= 5) {
                    result.engineNo = m[1].toUpperCase();
                }
            }

            // Chassis Number
            if (/\bCHASSIS\s*(?:NUMBER|NO\.?)/i.test(U) && !/ENGINE/i.test(U)) {
                const m = line.match(/\bCHASSIS\s*(?:NUMBER|NO\.?)\s*[:.\-]?\s*([A-Z0-9\-]+)/i);
                if (m && m[1] && /[A-Z]/.test(m[1]) && /\d/.test(m[1]) && m[1].length >= 5) {
                    result.chassisNo = m[1].toUpperCase();
                }
            }

            // Vehicle Make
            if (/\bVEHICLE\s*MAKE\b/i.test(U) && !/MODEL|VARIANT/i.test(U)) {
                const m = line.match(/\bVEHICLE\s*MAKE\s*[:.\-]?\s*([A-Za-z0-9\s]+)/i);
                if (m && m[1] && !/MODEL|TYPE|NUMBER|YEAR|VARIANT/i.test(m[1])) {
                    result.make = titleCase(m[1].trim());
                }
            }

            // Vehicle Model
            if (/\bVEHICLE\s*MODEL\b/i.test(U) && !/MAKE|VARIANT/i.test(U)) {
                const m = line.match(/\bVEHICLE\s*MODEL\s*[:.\-]?\s*([A-Za-z0-9\s\-]+)/i);
                if (m && m[1] && !/MAKE|VARIANT|NUMBER|YEAR|TYPE/i.test(m[1])) {
                    result.model = titleCase(m[1].trim());
                }
            }

            // Vehicle Variant
            if (/\bVEHICLE\s*VARIANT\b/i.test(U) && !/MAKE|MODEL/i.test(U)) {
                const m = line.match(/\bVEHICLE\s*VARIANT\s*[:.\-]?\s*([A-Za-z0-9\s\-]+)/i);
                if (m && m[1] && !/MAKE|MODEL|NUMBER|ABOUT|YOUR/i.test(m[1])) {
                    result.variant = titleCase(m[1].trim());
                }
            }

            // Fuel
            if (/\bFUEL\b/i.test(U) && !/NUMBER|CUBIC|CAPACITY/i.test(U)) {
                const m = line.match(/\bFUEL\s*[:.\-]?\s*(PETROL|DIESEL|CNG(?:\s*\/\s*LPG)?|LPG|EV|ELECTRIC|HYBRID)\b/i);
                if (m) result.fuelType = titleCase(m[1]);
            }
        }

        // Clean out invalid captures from subtype regexes
        if (result.registrationNo && (!/\d/.test(result.registrationNo) || /VEHICLE|MAKE|MODEL|NUMBER/i.test(result.registrationNo))) {
            result.registrationNo = '';
        }
        if (result.make && /MODEL|VARIANT|MAKE|ABOUT|YOUR|VEHICLE|NUMBER/i.test(result.make)) {
            result.make = '';
        }
        if (result.model && /MODEL|VARIANT|MAKE|ABOUT|YOUR|VEHICLE|NUMBER/i.test(result.model)) {
            result.model = '';
        }
        if (result.variant && /MODEL|VARIANT|MAKE|ABOUT|YOUR|VEHICLE|NUMBER/i.test(result.variant)) {
            result.variant = '';
        }
        if (result.fuelType && !/^(?:Petrol|Diesel|Cng|Lpg|Ev|Electric|Hybrid)/i.test(result.fuelType)) {
            result.fuelType = '';
        }

        if (!result.registrationNo) {
            const regMatch = upper.match(/\b([A-Z]{2}\s*[-]?\s*[0-9]{1,2}\s*[-]?\s*[A-Z]{1,3}\s*[-]?\s*[0-9]{4})\b/)
                || upper.match(/\b([0-9]{2}\s*BH\s*[0-9]{4}\s*[A-Z]{1,2})\b/);
            if (regMatch) {
                result.registrationNo = regMatch[1].trim().replace(/\s+/g, ' ').toUpperCase();
            }
        }

        // Engine Number & Chassis Number
        // 1. Combined Engine & Chassis Number (e.g. "Engine & Chassis Number: JC44E0248187 & ME4JC445H98238320")
        if (!result.engineNo || !result.chassisNo) {
            for (let i = 0; i < lines.length; i++) {
                const combined = (lines[i] + ' ' + (lines[i + 1] || '')).toUpperCase();
                if (/ENGINE\s*(?:&|\/)\s*CHASSIS/i.test(combined)) {
                    const ecMatch = combined.match(/(?:ENGINE\s*(?:&|\/)\s*CHASSIS\s*(?:NUMBER|NO\.?)?[\s:]+)?([A-Z0-9-]{5,25})\s*(?:&|\/)\s*([A-Z0-9-]{5,25})/i);
                    if (ecMatch && /[A-Z]/.test(ecMatch[1]) && /\d/.test(ecMatch[1]) && /[A-Z]/.test(ecMatch[2]) && /\d/.test(ecMatch[2])) {
                        result.engineNo = ecMatch[1];
                        result.chassisNo = ecMatch[2];
                        break;
                    }
                } else if (/CHASSIS\s*(?:&|\/)\s*ENGINE/i.test(combined)) {
                    const ceMatch = combined.match(/(?:CHASSIS\s*(?:&|\/)\s*ENGINE\s*(?:NUMBER|NO\.?)?[\s:]+)?([A-Z0-9-]{5,25})\s*(?:&|\/)\s*([A-Z0-9-]{5,25})/i);
                    if (ceMatch && /[A-Z]/.test(ceMatch[1]) && /\d/.test(ceMatch[1]) && /[A-Z]/.test(ceMatch[2]) && /\d/.test(ceMatch[2])) {
                        result.chassisNo = ceMatch[1];
                        result.engineNo = ceMatch[2];
                        break;
                    }
                }
            }
        }

        // 2. Separate Engine Number & Chassis Number labels
        if (!result.engineNo) {
            const engMatch = upper.match(/(?:\bENGINE\b|\bMOTOR\b)\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*([A-Z0-9-]{5,25})/i);
            if (engMatch && /\d/.test(engMatch[1]) && !/CHASSIS/i.test(engMatch[0])) {
                result.engineNo = engMatch[1].replace(/[^A-Z0-9-]/gi, '').trim();
            }
        }
        if (!result.chassisNo) {
            const chasMatch = upper.match(/(?:\bCHASSIS\b|\bVIN\b|\bFRAME\b)\s*(?:NO\.?|NUMBER|#)?\s*[:.\-]?\s*([A-Z0-9-]{5,25})/i);
            if (chasMatch && /\d/.test(chasMatch[1]) && !/ENGINE/i.test(chasMatch[0])) {
                result.chassisNo = chasMatch[1].replace(/[^A-Z0-9-]/gi, '').trim();
            }
        }

        // Manufacturing Year
        if (!result.manufacturingYear) {
            const mfgMatch = upper.match(/(?:MFG|MANUFACTURING|YEAR\s*OF\s*MFG|YEAR\s*OF\s*MANUFACTURE)\s*(?:YEAR|DATE)?\s*[:.\-]?\s*([12][0-9]{3})\b/i);
            if (mfgMatch) {
                const y = parseInt(mfgMatch[1], 10);
                if (y >= 1990 && y <= new Date().getFullYear() + 1) {
                    result.manufacturingYear = String(y);
                }
            }
        }

        // Fuel Type
        if (!result.fuelType) {
            const fuelMatch = upper.match(/\b(PETROL|DIESEL|CNG(?:\s*\/\s*LPG)?|LPG|EV|ELECTRIC|HYBRID)\b/);
            if (fuelMatch) result.fuelType = titleCase(fuelMatch[1]);
        }

        // Make, Model & Variant
        if (!result.make || !result.model) {
            // First check combined line: "Make, Model & Variant" or "Vehicle Make Model & Variant"
            for (let i = 0; i < lines.length; i++) {
                const U = lines[i].toUpperCase();
                if (/(?:VEHICLE\s*)?MAKE\s*,?\s*MODEL\s*(?:&|\/|\+)?\s*VARIANT/i.test(U)) {
                    let targetStr = lines[i].replace(/.*(?:VEHICLE\s*)?MAKE\s*,?\s*MODEL\s*(?:&|\/|\+)?\s*VARIANT\s*[:.\-]?\s*/i, '').trim();
                    if (!targetStr && lines[i + 1] && !/RTO|LOCATION|SEATING|ENGINE|CHASSIS/i.test(lines[i + 1])) {
                        targetStr = lines[i + 1].trim();
                    }
                    if (targetStr && targetStr.length >= 3) {
                        const parts = targetStr.split(/[,&]/).map(p => p.trim()).filter(Boolean);
                        if (parts.length >= 2) {
                            result.make = titleCase(parts[0]);
                            result.model = titleCase(parts[1]);
                            if (parts[2]) result.variant = titleCase(parts.slice(2).join(' '));
                            break;
                        }
                    }
                }
            }

            // Next check separate MAKE ... and MODEL ... labels (even on lines with other table columns)
            if (!result.make) {
                const makeLabelMatch = upper.match(/\bMAKE\s*[:.\-]?\s*([A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)?)\b/i);
                if (makeLabelMatch && !/MODEL|YEAR|REGISTRATION|POLICY|CHASSIS|ENGINE|VARIANT/i.test(makeLabelMatch[1])) {
                    result.make = titleCase(makeLabelMatch[1].trim());
                }
            }
            if (!result.model) {
                const modelLabelMatch = upper.match(/\bMODEL\s*[:.\-]?\s*([A-Za-z0-9\-]+(?:\s+[A-Za-z0-9\-]+){0,4}(?:\([^\)]+\))?)/i);
                if (modelLabelMatch) {
                    const cleanMod = modelLabelMatch[1].split(/(?:PERIOD|YEAR|REGISTRATION|POLICY|CHASSIS|ENGINE|DATE|VARIANT)/i)[0].trim();
                    if (cleanMod.length >= 2) result.model = titleCase(cleanMod);
                }
            }

            // Keyword fallback list of known makes
            if (!result.make || !result.model) {
                const makes = [
                    'HONDA', 'MARUTI', 'MARUTI SUZUKI', 'HYUNDAI', 'TATA', 'MAHINDRA', 'TOYOTA',
                    'KIA', 'BAJAJ', 'HERO', 'TVS', 'ROYAL ENFIELD', 'YAMAHA', 'SUZUKI', 'CHEVROLET',
                    'FORD', 'VOLKSWAGEN', 'SKODA', 'RENAULT', 'NISSAN', 'MG', 'MERCEDES', 'BMW',
                    'AUDI', 'JEEP', 'VOLVO', 'ATHER', 'OLA', 'KTM', 'JAWA', 'FORCE'
                ];
                for (let i = 0; i < lines.length; i++) {
                    const upLine = lines[i].toUpperCase();
                    const foundMake = makes.find(m => upLine.includes(m));
                    if (foundMake) {
                        if (!result.make) result.make = titleCase(foundMake);
                        let modelStr = upLine.replace(foundMake, '').trim();
                        if (lines[i + 1] && !/RTO|LOCATION|SEATING|CAPACITY|ENGINE|CHASSIS|NUMBER|FUEL|CUBIC|MANUFACTURING|YEAR|REGISTRATION|VEHICLE|MAKE|MODEL|VARIANT/i.test(lines[i + 1])) {
                            modelStr += ' ' + lines[i + 1].trim();
                        }
                        modelStr = modelStr.replace(/^[,&\\-\\s]+/, '').replace(/MOTORCYCLES?,?\\s*/i, '');
                        if (modelStr && !result.model) {
                            const parts = modelStr.split(/&|,/);
                            result.model = titleCase(parts[0].trim());
                            if (parts.length > 1 && !result.variant) result.variant = titleCase(parts.slice(1).join(' ').trim());
                        }
                        break;
                    }
                }
            }
        }

        // IDV (Insured Declared Value)
        if (!result.idv) {
            const idvMatch = upper.match(/(?:INSURED\s*DECLARED\s*VALUE|IDV)\s*(?:\([A-Z]+\))?\s*[:.\-]?\s*(?:RS\.?|INR)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
            if (idvMatch) result.idv = idvMatch[1].trim();
        }

        // NCB
        if (!result.ncb) {
            const ncbMatch = upper.match(/(?:NCB|NO\s*CLAIM\s*BONUS)\s*[:.\-]?\s*([0-9]{1,3}\s*%?)/i);
            if (ncbMatch) result.ncb = ncbMatch[1].trim();
        }
    }

    /* 8) Health Specific Fallbacks */
    if (result.insuranceType === 'HEALTH' || bestSubtype === 'HEALTH') {
        result.insuranceType = 'HEALTH';
        if (!result.sumInsured) {
            const siMatch = upper.match(/(?:SUM\s*INSURED|SUM\s*ASSURED|COVERAGE\s*AMOUNT|BASIC\s*SI)\s*[:.\-]?\s*(?:RS\.?|INR)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
            if (siMatch) result.sumInsured = siMatch[1].trim();
        }
        if (!result.tpa) {
            const tpaMatch = upper.match(/(?:TPA|THIRD\s*PARTY\s*ADMINISTRATOR)\s*[:.\-]?\s*([A-Za-z0-9\s.&,\-]{3,50})/i);
            if (tpaMatch) result.tpa = titleCase(tpaMatch[1].trim());
        }
    }

    /* 9) Contact Details Fallbacks (Phone, Email, Address) */
    if (!result.phone) {
        const phoneMatch = text.match(/(?:Tel\.?|Contact\s*(?:No\.?|Number)|Phone\s*(?:No\.?|Number)|Mobile\s*(?:No\.?|Number)|Mob\.?)\s*[:.\-]?\s*(?:\+?91[-\s]?)?([6-9]\d{9})\b/i)
            || text.match(/(?:Ph|Phone|Mobile|Contact|Tel|Mob)\s*(?:No\.?|Number|#)?\s*[:.\-]?\s*(\+?\d{1,3}[-\s]?[6-9]\d{9}|\+?\d{1,4}[-\s]?\d{3,5}[-\s]?\d{4,8})\b/i)
            || text.match(/\b(?:\+91[-\s]?)?([6-9]\d{9})\b/);
        if (phoneMatch) result.phone = phoneMatch[1].trim();
    }
    if (!result.email) {
        const emailMatches = text.matchAll(/\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g);
        for (const em of emailMatches) {
            const emailAddr = em[1].trim();
            // Prefer customer email over general company support emails
            if (!/support@|care@|grievance@|helpdesk@|info@/i.test(emailAddr)) {
                result.email = emailAddr;
                break;
            }
            if (!result.email) result.email = emailAddr;
        }
    }
    if (!result.address || result.address.length < 8 || /InsureMo/i.test(result.address)) {
        result.address = '';
        // 1. Look for explicit Address block with actual content following
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/(?:Proposer\s*Address|Communication\s*Address|Correspondence\s*Address)\s*[:.\-]?\s*(.+)/i.test(line)) {
                const m = line.match(/(?:Proposer\s*Address|Communication\s*Address|Correspondence\s*Address)\s*[:.\-]?\s*(.+)/i);
                if (m && m[1]) {
                    let addr = m[1].trim();
                    let j = i + 1;
                    while (j < lines.length && j <= i + 3) {
                        const nextL = lines[j];
                        if (/^(?:Proposer|Policy|Contact|Phone|Email|Mobile|Insured|Nominee|Details|Registration|Vehicle)/i.test(nextL)) break;
                        if (/\b(?:India|\d{6}|Pradesh|Nagar|Colony|Road|Street)\b/i.test(nextL) || nextL.includes(',')) {
                            addr += ' ' + nextL;
                            j++;
                        } else {
                            break;
                        }
                    }
                    addr = addr.replace(/\s+/g, ' ').replace(/^[,:.\s\-]+/, '').trim();
                    if (addr.length >= 10 && !/InsureMo/i.test(addr)) {
                        result.address = addr;
                        break;
                    }
                }
            }
        }

        // 2. Scan for address lines containing Indian PIN code or state
        if (!result.address) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (/\b\d{6}\b/.test(line) && /\b(?:India|Pradesh|Maharashtra|Delhi|Gujarat|Rajasthan|Haryana|Punjab|Karnataka|Tamil|Bengal|Bihar)\b/i.test(line)) {
                    let addr = line;
                    if (lines[i - 1] && /\b(?:Road|Colony|Gali|Street|Nagar|Sector|Floor|House|Plot|Flat)\b/i.test(lines[i - 1])) {
                        addr = lines[i - 1] + ' ' + addr;
                    }
                    addr = addr.replace(/\s+/g, ' ').replace(/^[,:.\s\-]+/, '').trim();
                    if (addr.length >= 10 && !/InsureMo/i.test(addr)) {
                        result.address = addr;
                        break;
                    }
                }
            }
        }
    }

    /* 10) Date normalization & Sanity */
    result.dob = toISO(result.dob);
    result.effectiveDate = toISO(result.effectiveDate);
    result.doe = toISO(result.doe);

    if (result.effectiveDate && result.doe && result.effectiveDate > result.doe) {
        const swap = result.effectiveDate;
        result.effectiveDate = result.doe;
        result.doe = swap;
    }

    result.memberName = titleCase(result.memberName);
    if (result.make) result.make = titleCase(result.make);
    if (result.fuelType) result.fuelType = titleCase(result.fuelType);
    const nameTokens = result.memberName ? result.memberName.split(/\s+/) : [];
    result.firstName = nameTokens[0] || '';
    result.lastName = nameTokens.slice(1).join(' ') || '';

    try { fs.writeFileSync(OCR_OUTPUT_FILE, text); } catch { }
    console.log('[PARSER] Insurance result:', JSON.stringify(result, null, 2));
    return result;
}

module.exports = { parseInsuranceText };
