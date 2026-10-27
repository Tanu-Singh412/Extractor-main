const { DATE_RE, toISO } = require('../helpers/dates');
const { titleCase, cleanAddress, cleanRelativeName, correctIndianPassportNumber } = require('../helpers/fields');
const { reconcileNames } = require('../helpers/names');

function applyFieldFallbacks(result, rawText, { lines, visualSurname, visualGivenNames, extraFields }) {
    const text = String(rawText || '');
    // Merge extra in-loop fields into result (extraFields take precedence over positional guesses)
    Object.assign(result, extraFields);

    // Normalise any extracted relational names (ensure they are cleaned and capitalised)
    if (result.fatherName) result.fatherName = cleanRelativeName(result.fatherName.replace(/[^A-Z\s]/g, '').trim());
    if (result.motherName) result.motherName = cleanRelativeName(result.motherName.replace(/[^A-Z\s]/g, '').trim());
    if (result.spouseName) result.spouseName = cleanRelativeName(result.spouseName.replace(/[^A-Z\s]/g, '').trim());

    // Validate relational names – discard if they look like noise or are too short
    const isValidName = (name) => {
        if (!name) return false;
        const tokens = name.split(/\s+/).filter(t => t.length > 0);
        if (tokens.length < 2) return false; // need at least first and last
        return tokens.every(t => /^[A-Z]+$/.test(t) && t.length >= 3);
    };
    if (result.fatherName && !isValidName(result.fatherName)) delete result.fatherName;
    if (result.motherName && !isValidName(result.motherName)) delete result.motherName;
    if (result.spouseName && !isValidName(result.spouseName)) delete result.spouseName;

    /* ── Consolidated single-pass label-anchored fallbacks ────────────────
       Only extract a field when an explicit label keyword is found.        */
    const rawUpper = rawText.toUpperCase();

    // Address
    if (!result.address) {
        const addrM = rawUpper.match(/(?:ADDRESS|RESIDENCE|STREET|ROAD|NAGAR|COLONY|FLAT|HOUSE)\s*[:\-]?\s*([A-Z0-9][A-Z0-9\s,\.\-\/]{4,120})/);
        if (addrM && addrM[1]) result.address = cleanAddress(addrM[1].split(/\n/)[0].trim());
    }
    // Father name — label-anchored only
    if (!result.fatherName) {
        const fnMatch = rawUpper.match(/(?:FATHER(?:'?S)?\s*(?:NAME)?|NAME\s*OF\s*FATHER)\s*[:\-]?\s*([A-Z][A-Z\s\.]{3,50})/);
        if (fnMatch && fnMatch[1]) result.fatherName = cleanRelativeName(fnMatch[1].replace(/[^A-Z\s]/g,'').trim());
    }
    // Mother name — label-anchored only
    if (!result.motherName) {
        const mnMatch = rawUpper.match(/(?:MOTHER(?:'?S)?\s*(?:NAME)?|NAME\s*OF\s*MOTHER|MODHER)\s*[:\-]?\s*([A-Z][A-Z\s\.]{3,50})/);
        if (mnMatch && mnMatch[1]) result.motherName = cleanRelativeName(mnMatch[1].replace(/[^A-Z\s]/g,'').trim());
    }
    // Spouse name — label-anchored only
    // Spouse name — label-anchored only
    if (!result.spouseName) {
        const snMatch = rawUpper.match(/(?:SPOUSE(?:'?S)?\s*(?:NAME)?|WIFE(?:'?S)?\s*(?:NAME)?|HUSBAND(?:'?S)?\s*(?:NAME)?|MARRIED\s*TO|SASS)\s*[:\-]?\s*([A-Z][A-Z\s\.]{3,50})/);
        if (snMatch && snMatch[1]) result.spouseName = cleanRelativeName(snMatch[1].replace(/[^A-Z\s]/g,'').trim());
    }
    // Additional fallback for spouse – capture any capital name after keywords
    if (!result.spouseName) {
        for (const l of lines) {
            const match = l.toUpperCase().match(/(?:SPOUSE|WIFE|HUSBAND)\s*[:\-]?\s*([A-Z\s]{2,30})/);
            if (match && match[1]) {
                result.spouseName = cleanRelativeName(match[1].replace(/[^A-Z\s]/g,'').trim());
                break;
            }
        }
    }

    // Old passport number — label-anchored
    if (!result.oldPassportNo) {
        const opM = rawUpper.match(/(?:OLD|PREVIOUS|FORMER|PASION)\s*(?:PASSPORT|PP)?\s*(?:NO|NUMBER|NUM)?\s*[:\-]?\s*([A-Z][A-Z0-9]{5,13})/);
        if (opM && opM[1] && !/^(?:PASSPORT|P455P0R7|WITH|DATE|AND|PLACE|ISSU|NONE|NIL)$/i.test(opM[1])) {
            result.oldPassportNo = correctIndianPassportNumber(opM[1].trim());
        }
    }
    // Also: old passport no often appears as "alphanumeric + date" pattern on one line
    if (!result.oldPassportNo) {
        const opM2 = rawUpper.match(/\b([A-Z][A-Z0-9]{6,8})\b\s+\d{2}[\/-]\d{2}[\/-]\d{4}/);
        if (opM2 && opM2[1] && opM2[1] !== result.passportNo && !/PASSPORT|P455/i.test(opM2[1])) {
            result.oldPassportNo = correctIndianPassportNumber(opM2[1]);
        }
    }
    if (result.oldPassportNo && /PASSPORT|P455/i.test(result.oldPassportNo)) {
        result.oldPassportNo = '';
    }

    // Place of issue — label-anchored; ignore lines containing 'OLD' or 'DATE AND'
    const NOISE_WORDS = new Set(['INU','MUN','AREN','LE','EL','SE','TT','PE','BE','SRL','SNM','HE','HI','OO','TEES','TEES I JE']);
    if (!result.placeOfIssue) {
        for (const l of lines) {
            const lup = l.toUpperCase();
            if (/(?:OLD|PREVIOUS|FORMER|DATE\s*AND|DATE\s*&)/.test(lup)) continue;
            const poiM = lup.match(/(?:PLACE\s*OF\s*(?:ISS\w*|LEIS\w*|IE\w*)|ISSUED\s*AT|ISSUE\s*PLACE|OFFICE\s*OF\s*ISSUE)\s*[:\-=]?\s*([A-Z][A-Z\s]{2,40})/);
            if (poiM && poiM[1]) {
                const clean = poiM[1].replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}.*/,'').replace(/[^A-Z\s]/g,'').trim();
                if (clean.length >= 3 && !NOISE_WORDS.has(clean)) {
                    result.placeOfIssue = titleCase(clean.split(/\s+/).slice(0,4).join(' '));
                    break;
                }
            }
        }
    }
    // Also try line-by-line: garbled 'Place of ie' label on one line, city on next
    if (!result.placeOfIssue) {
        for (let li = 0; li < lines.length - 1; li++) {
            const lup = lines[li].toUpperCase();
            if (/(?:OLD|PREVIOUS|FORMER|DATE\s*AND)/.test(lup)) continue;
            if (/PLACE\s*OF\s*(IE|ISS|LEIS)/.test(lup)) {
                // Next non-empty line should be the city
                for (let ni = li + 1; ni <= li + 3 && ni < lines.length; ni++) {
                    const nup = lines[ni].toUpperCase().replace(/[^A-Z\s]/g,' ').trim();
                    const cityM = nup.match(/\b(GHAZIABAD|AGRA|DELHI|MUMBAI|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/);
                    if (cityM) { result.placeOfIssue = titleCase(cityM[1]); break; }
                    // Also take first clean word-only token >= 5 chars as city
                    const firstWord = nup.split(/\s+/)[0];
                    if (firstWord && firstWord.length >= 5 && /^[A-Z]+$/.test(firstWord) && !NOISE_WORDS.has(firstWord)) {
                        result.placeOfIssue = titleCase(firstWord); break;
                    }
                }
                if (result.placeOfIssue) break;
            }
        }
    }
    // Fallback: pick first KNOWN city name appearing on its own line
    if (!result.placeOfIssue) {
        for (const l of lines) {
            const up = l.toUpperCase().trim();
            if (/\b(GHAZIABAD|AGRA|DELHI|MUMBAI|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/.test(up)
                && !/(PASSPORT|DOB|BIRTH|EXPIR|ADDRESS|PIN|OLD|PREVIOUS)/.test(up)) {
                const m = up.match(/\b(GHAZIABAD|AGRA|DELHI|MUMBAI|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/);
                if (m) { result.placeOfIssue = titleCase(m[1]); break; }
            }
        }
    }
    // Priority 2: derive from address
    if (!result.placeOfIssue && result.address) {
        const cityMatch = result.address.match(/\b(AGRA|DELHI|MUMBAI|GHAZIABAD|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/i);
        if (cityMatch) result.placeOfIssue = titleCase(cityMatch[1]);
    }

    // File number — prefer Indian format (letter + 12-16 digits), then label-anchored
    if (!result.fileNo) {
        for (const l of lines) {
            if (l.includes('<')) continue;
            const fm = l.match(/(?:^|[^A-Z0-9])([A-Z]\s*\d{12,16})(?:[^A-Z0-9]|$)/);
            if (fm) { result.fileNo = fm[1].replace(/\s/g,''); break; }
        }
    }
    // Pure-digit file numbers (12-16 digits anywhere in a line, not in MRZ)
    if (!result.fileNo) {
        for (const l of lines) {
            if (l.includes('<')) continue;
            const fm2 = l.match(/\b(\d{12,16})\b/);
            if (fm2) { result.fileNo = fm2[1]; break; }
        }
    }
    if (!result.fileNo) {
        const fnM = rawUpper.match(/(?:FILE|DOCUMENT)\s*NO\.?\s*[:\-]?\s*([A-Z0-9]{3,20})/);
        if (fnM && fnM[1]) result.fileNo = fnM[1].trim();
    }
    // Alphanumeric file number like GZ1234567890123
    if (!result.fileNo) {
        for (const l of lines) {
            const m = l.toUpperCase().match(/^[A-Z]{1,2}\d{10,16}$/);
            if (m) { result.fileNo = m[0].trim(); break; }
        }
    }
    // Correct OCR misread of Ghaziabad RPO 'GZ' as '62'
    if (result.fileNo && /^62\d{12,16}$/.test(result.fileNo)) {
        result.fileNo = 'GZ' + result.fileNo.slice(2);
    }

    // Place of birth — label-anchored
    if (!result.placeOfBirth) {
        const pobM = rawUpper.match(/PLACE\s*OF\s*BIRTH\s*[:\-]?\s*([A-Z][A-Z\s,]{2,60})/);
        if (pobM && pobM[1]) {
            const clean = pobM[1].replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}.*/,'').replace(/[^A-Z\s,]/g,'').trim();
            if (clean.length >= 2) result.placeOfBirth = titleCase(clean.split(/\s+/).slice(0,5).join(' '));
        }
    }
    // Place of birth — City, State pattern on Page 1 (e.g. "MEERUT, UTTAR PRADESH")
    if (!result.placeOfBirth) {
        for (const l of lines) {
            const up = l.toUpperCase().trim();
            if (/(PASSPORT|DOB|EXPIR|ADDRESS|PIN|OLD|PREVIOUS|DATE|ISSUE)/.test(up)) continue;
            const stateM = up.match(/\b([A-Z]{3,20}),\s*(UTTAR\s*PRADESH|MADHYA\s*PRADESH|MAHARASHTRA|GUJARAT|PUNJAB|HARYANA|RAJASTHAN|BIHAR|WEST\s*BENGAL|KARNATAKA|TAMIL\s*NADU|KERALA|ODISHA|ASSAM|DELHI|GOA)\b/);
            if (stateM) {
                result.placeOfBirth = titleCase(stateM[0]);
                break;
            }
        }
    }
    // Additional fallback for place of birth – known city on its own line
    if (!result.placeOfBirth) {
        for (const l of lines) {
            const up = l.toUpperCase().trim();
            if (/\b(GHAZIABAD|AGRA|DELHI|MUMBAI|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/.test(up)
                && !/(PASSPORT|OLD|PREVIOUS|ISSUE|EXPIR|ADDRESS|PIN)/.test(up)
                && !NOISE_WORDS.has(up)) {
                const m = up.match(/\b(GHAZIABAD|AGRA|DELHI|MUMBAI|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/);
                if (m) { result.placeOfBirth = titleCase(m[1]); break; }
            }
        }
    }
    // Derive from address if still empty
    if (!result.placeOfBirth && result.address) {
        const cityMatch = result.address.match(/\b(AGRA|DELHI|MUMBAI|GHAZIABAD|CHENNAI|KOLKATA|BENGALURU|HYDERABAD|PUNE|JAIPUR|LUCKNOW)\b/i);
        if (cityMatch) result.placeOfBirth = titleCase(cityMatch[1]);
    }






    /* Names: MRZ + visual cross-check */
    result.surname = reconcileNames(result.surname, visualSurname, text);
    result.givenNames = reconcileNames(result.givenNames, visualGivenNames, text);

    /* ── Additional tolerant fallbacks for any fields still empty ── */
    const isIndianRelDoc = (!result.nationality || result.nationality === 'IND') && (!result.issuingCountry || result.issuingCountry === 'IND');
    if (isIndianRelDoc) {
        // Father name – infer from a line with three or more capital words that includes the surname
        if (!result.fatherName) {
            for (const l of lines) {
                const up = l.toUpperCase();
                const match = up.match(/([A-Z]+(?:\s+[A-Z]+){2,})/);
                if (match && match[1].includes(result.surname.toUpperCase())) {
                    result.fatherName = cleanRelativeName(match[1].replace(/[^A-Z\s]/g, '').trim());
                    break;
                }
            }
        }
        // Mother name – infer from a line with two capital words that includes the surname
        if (!result.motherName) {
            // Primary heuristic: two-word capital line containing surname
            for (const l of lines) {
                const up = l.toUpperCase();
                const match = up.match(/([A-Z]+\s+[A-Z]+)/);
                if (match && match[1].includes(result.surname.toUpperCase())) {
                    result.motherName = cleanRelativeName(match[1].replace(/[^A-Z\s]/g, '').trim());
                    break;
                }
            }
            // Additional fallback: three-word line (e.g., first middle last) containing surname
            if (!result.motherName) {
                for (const l of lines) {
                    const up = l.toUpperCase();
                    const match3 = up.match(/([A-Z]+(?:\s+[A-Z]+){2,})/);
                    if (match3 && match3[1].includes(result.surname.toUpperCase())) {
                        result.motherName = cleanRelativeName(match3[1].replace(/[^A-Z\s]/g, '').trim());
                        break;
                    }
                }
            }
        }
    }
    // Final fallback: look for explicit "MOTHER" label
    if (!result.motherName) {
        const momMatch = rawUpper.match(/\b(?:MOTHER(?:'?S)?(?:\s*NAME)?|NAME\s*OF\s*MOTHER)\s*[:\-]?\s*([A-Z][A-Z\s\.]{3,50})/);
        if (momMatch && momMatch[1]) {
            result.motherName = cleanRelativeName(momMatch[1].replace(/[^A-Z\s]/g, '').trim());
        }
    }
    // Spouse name – look for common spouse markers
    if (!result.spouseName) {
        // Primary label‑based spouse extraction
        const spMatch = rawUpper.match(/(?:MRS|WIFE|SPOUSE)\s*[:\-]?\s*([A-Z][A-Z\s\.]{3,50})/);
        if (spMatch && spMatch[1]) {
            result.spouseName = cleanRelativeName(spMatch[1].replace(/[^A-Z\s]/g, '').trim());
        }
        // Additional fallback: any capital name after spouse keywords
        if (!result.spouseName) {
            for (const l of lines) {
                const match = l.toUpperCase().match(/(?:SPOUSE|WIFE|HUSBAND)\s*[:\-]?\s*([A-Z\s]{2,30})/);
                if (match && match[1]) {
                    result.spouseName = cleanRelativeName(match[1].replace(/[^A-Z\s]/g, '').trim());
                    break;
                }
            }
        }
        // Final fallback: look for explicit "SPOUSE" label without colon
        if (!result.spouseName) {
            const spouseLabel = rawUpper.match(/SPOUSE\s+([A-Z][A-Z\s]{2,50})/);
            if (spouseLabel && spouseLabel[1]) {
                result.spouseName = cleanRelativeName(spouseLabel[1].replace(/[^A-Z\s]/g, '').trim());
            }
        }
    }
    // Place of birth – look for a line with BIRTH label
    if (!result.placeOfBirth) {
        for (const l of lines) {
            const up = l.toUpperCase();
            const m = up.match(/BIRTH\s*[:\-]?\s*([A-Z][A-Z\s,]{2,60})/);
            if (m && m[1]) {
                const clean = m[1].replace(/\d{1,2}[\/\-\.]/g, '').replace(/[^A-Z\s,]/g, '').trim();
                if (clean.length >= 2) result.placeOfBirth = titleCase(clean.split(/\s+/).slice(0,5).join(' '));
                break;
            }
        }
    }
    // If Place of Birth still empty, reuse Place of Issue (often same city)
    if (!result.placeOfBirth && result.placeOfIssue) {
        result.placeOfBirth = result.placeOfIssue;
    }
    // Extract PIN from address if present
    if (!result.pin && result.address) {
        const pinMatch = result.address.match(/\b\d{6}\b/);
        if (pinMatch) {
            result.pin = pinMatch[0];
        }
    }
    // File number – capture any long alphanumeric token after FILE/DOCUMENT label
    if (!result.fileNo) {
        for (const l of lines) {
            const up = l.toUpperCase();
            const m = up.match(/(?:FILE|DOCUMENT)\s*NO\.?\s*[:]?\s*([A-Z0-9]{8,20})/);
            if (m && m[1]) { result.fileNo = m[1].trim(); break; }
        }
    }

    /* --- 2b) Date fallback: chronological assign --- */
    if (!result.dob || !result.doe || !result.issueDate) {
        const all = [];
        for (const line of lines) {
            if (line.includes('<')) continue;
            for (const m of line.toUpperCase().matchAll(DATE_RE)) {
                const d = toISO(m[0]);
                if (d && !all.includes(d) && d !== result.dob && d !== result.doe && d !== result.issueDate) {
                    all.push(d);
                }
            }
        }
        const sorted = [...all].sort();
        const today = new Date().toISOString().slice(0, 10);
        if (!result.dob && sorted.length > 0) {
            const pastDates = sorted.filter(d => d <= today);
            result.dob = pastDates[0] || '';
        }
        if (!result.doe && sorted.length > 0) {
            result.doe = sorted[sorted.length - 1] || '';
        }
        if (!result.issueDate && sorted.length > 0) {
            const validCandidates = sorted.filter(d => d !== result.dob && d !== result.doe && d <= today);
            if (validCandidates.length > 0) {
                if (result.doe) {
                    const doeTime = new Date(result.doe).getTime();
                    const targetTime = doeTime - (10 * 365.25 * 24 * 3600 * 1000);
                    validCandidates.sort((a, b) => Math.abs(new Date(a).getTime() - targetTime) - Math.abs(new Date(b).getTime() - targetTime));
                    result.issueDate = validCandidates[0];
                } else {
                    result.issueDate = validCandidates[validCandidates.length - 1];
                }
            }
        }
    }
}

module.exports = { applyFieldFallbacks };
