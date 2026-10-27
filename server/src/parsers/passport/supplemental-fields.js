const { titleCase, cleanAddress, cleanRelativeName } = require('../helpers/fields');

function extractSupplementalFields(result, lines, extraFields) {
    /* =========================================================
    POST-PROCESSING: Extract additional Indian passport fields
    (fatherName, motherName, spouseName, address, placeOfIssue,
        fileNo, oldPassportNo) directly from raw OCR lines.
    This runs AFTER all other extraction so it won't overwrite
    fields already filled by MRZ / visual / LLM.
    ========================================================= */

    // --- File Number: Indian passport format = letter + 13-16 digits ---
    if (!result.fileNo) {
        for (const line of lines) {
            if (line.includes('<')) continue;
            const fm = line.match(/(?:^|[^A-Z])([A-Z]\s*\d{13,16})(?:\b|$)/);
            if (fm) { result.fileNo = fm[1]; break; }
        }
    }

    // --- Place of Issue: fuzzy match "Place of Issue/Iss/leis" ---
    if (!result.placeOfIssue) {
        for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase();
            if (up.includes('<')) continue;
            // Match garbled OCR: "Place of Issue", "Place of Iss", "Place of leis", "Plies of fess" etc.
            if (/PLACE\s*OF\s*(ISS|LEIS|IS(?:SU)?|BEY|I55)/i.test(up) || /PLIES\s*OF\s*FESS/i.test(up)) {
                // Try to extract value from same line
                const valMatch = up.match(/(?:PLACE|PLIES)\s*OF\s*(?:ISS\w*|LEIS\w*|IS(?:SU)?\w*|BEY|I55|FESS)\s*[:\-]?\s*([A-Z]+)/i);
                if (valMatch && valMatch[1] && !/^(ON|OF)$/.test(valMatch[1])) {
                    const cleanVal = valMatch[1].replace(/[^A-Z]/gi, '').trim();
                    if (cleanVal.length >= 3) result.placeOfIssue = titleCase(cleanVal);
                }
                // Try next line if value not found
                if (!result.placeOfIssue && i + 1 < lines.length) {
                    const nxt = lines[i + 1].toUpperCase().replace(/[^A-Z\s]/g, '').trim();
                    const cityTokens = nxt.split(/\s+/).filter(t => t.length >= 4 && !/^(THE|AND|FOR|FROM|WITH|EXPIRE)$/.test(t));
                    if (cityTokens.length > 0) {
                        result.placeOfIssue = titleCase(cityTokens[0]);
                    }
                }
                if (result.placeOfIssue) break;
            }
        }
    }

    // --- Address: look for PIN code pattern and gather surrounding lines (Indian passports only) ---
    const isIndianDoc = (!result.nationality || result.nationality === 'IND') && (!result.issuingCountry || result.issuingCountry === 'IND');
    if (!result.address && isIndianDoc) {
        for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase();
            if (up.includes('<')) continue;
            // Match valid Indian PIN 1-8 followed by 5 digits
            if (/\b(?:PIN\s*(?:CODE)?\s*:?\s*)?[1-8]\d{5}\b/i.test(up)) {
                const addrParts = [];
                for (let j = Math.max(0, i - 3); j <= i + 1; j++) {
                    if (j >= lines.length) continue;
                    const raw = lines[j];
                    if (raw.includes('<')) continue;
                    const cleanedUp = raw.toUpperCase();
                    if (/(PASSPORT|DOB|ISSUE|EXPIR|NATIONALIT|SEX|FATHER|MOTHER|SPOUSE|DATE|PLACE OF BIRTH|FILE NO|OLD|PREVIOUS)/i.test(cleanedUp)) continue;
                    
                    const cleaned = raw.replace(/[|—=\[\]{}©®™]/g, '').replace(/\s+/g, ' ').trim();
                    if (cleaned.length < 4) continue;

                    // Exclude pure name lines without address signals unless it's the very line with PIN
                    const hasAddrSignal = /\d|PIN|NAGAR|COLONY|ROAD|STREET|MARG|LANE|SECTOR|BLOCK|FLAT|HOUSE|APART|FLOOR|RESIDENCY|APARTMENT|DISTRICT|TALUK|VILLAGE/i.test(cleanedUp);
                    if (!hasAddrSignal && /^[A-Z\s]+$/.test(cleanedUp) && cleanedUp.split(/\s+/).length <= 4 && j !== i) continue;
                    
                    if (!addrParts.includes(cleaned)) {
                        addrParts.push(cleaned);
                    }
                    if (/\b\d{6}\b/.test(cleanedUp) && j >= i) break;
                }
                if (addrParts.length > 0) {
                    let rawAddr = addrParts.join(', ');
                    rawAddr = rawAddr.replace(/\\\\+/g, '').replace(/\\\\/g, '').trim();
                    result.address = cleanAddress(rawAddr);
                    break;
                }
            }
        }
    }

    // --- Place of Birth: look for label and capture value ---
    if (!result.placeOfBirth) {
        for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase();
            if (up.includes('<')) continue;
            if (/PLACE\s+OF\s+BIRTH/i.test(up)) {
                const tokens = lines[i].split(/[:\-]/)[1] || lines[i + 1] || '';
                const cleaned = tokens.replace(/[^A-Z\s]/gi, '').trim();
                if (cleaned) result.placeOfBirth = titleCase(cleaned);
                break;
            }
        }
    }

    // --- Merge any extraFields that were populated (from the in-loop extraction) ---
    // Apply extraFields FIRST so they take precedence over guesses.
    for (const k of Object.keys(extraFields)) {
        if (extraFields[k] && !result[k]) {
            if (k === 'fileNo' || k === 'oldPassportNo') {
                result[k] = extraFields[k];
            } else {
                let val = titleCase(extraFields[k].split(/\s+/).slice(0, 5).join(' '));
                // Strip short trailing OCR-garbage tokens from family name fields
                if (['fatherName', 'motherName', 'spouseName'].includes(k)) {
                    val = cleanRelativeName(val);
                }
                result[k] = val;
            }
        }
    }

    // --- Family names: detect lines containing the holder's surname (Fallback) ---
    if ((!result.fatherName || !result.motherName || !result.spouseName)) {
        const familyNameLines = [];
        let targetSurname = '';
        const possibleSurnames = ['AGARWAL', 'SHARMA', 'KUMAR', 'SINGH', 'PATEL', 'GUPTA', 'JAIN', 'VERMA', 'DAS', 'REDDY', 'YADAV', 'SHAH'];
        for (const p of possibleSurnames) {
            if ((result.surname || '').includes(p)) { targetSurname = p; break; }
        }
        if (!targetSurname) targetSurname = (result.surname || '').replace(/[S]{2,}.*$/, '');
        if (targetSurname.length < 3) targetSurname = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('<')) continue;
            const up = line.toUpperCase();
            
            const nameTokens = up.replace(/[^A-Z\s]/g, ' ').trim().split(/\s+/).filter(t => t.length >= 3);
            if (nameTokens.length < 2 || nameTokens.length > 5) continue;

            let hasSurnameMatch = targetSurname && nameTokens.some(t => {
                if (t.includes(targetSurname)) return true;
                if (targetSurname.includes(t) && t.length >= 5) return true;
                if (t.length === targetSurname.length) {
                    let diffs = 0;
                    for (let c=0; c<t.length; c++) if (t[c] !== targetSurname[c]) diffs++;
                    return diffs <= 1;
                }
                return false;
            });
            
            if (!hasSurnameMatch) continue;

            if (/(PASSPORT|DATE|BIRTH|ISSUE|EXPIR|NUMBER|NATIONAL|TYPE|CODE|REPUBLIC|PLACE|COUNTRY|GENDER|AUTHOR|ADDRESS|RESIDENCY|NAGAR|PRADESH|GHAZIABAD|INDIA|LE\s*FL)/.test(up)) continue;
            
            let holderFirst = (result.givenNames || result.firstName || '').toUpperCase().split(/\s+/)[0] || '';
            if (holderFirst && holderFirst.length >= 3 && nameTokens.includes(holderFirst)) continue;

            const cleanTokens = nameTokens.filter(t => !/^(FGG|VIT|PES|TRE|SORS|ITH)$/.test(t));
            if (cleanTokens.length === 0) continue;
            const joined = cleanTokens.join(' ');
            
            if (!familyNameLines.includes(joined)) familyNameLines.push(joined);
        }

        console.log(`[PARSER] Family name candidates:`, familyNameLines);

        // Build a set of names already assigned by keyword-based extraction to avoid duplicates
        const alreadyAssigned = new Set();
        if (result.fatherName) alreadyAssigned.add(result.fatherName.toUpperCase().replace(/[^A-Z\s]/g, '').trim());
        if (result.motherName) alreadyAssigned.add(result.motherName.toUpperCase().replace(/[^A-Z\s]/g, '').trim());
        if (result.spouseName) alreadyAssigned.add(result.spouseName.toUpperCase().replace(/[^A-Z\s]/g, '').trim());

        let nameIdx = 0;
        // Filter out candidates that are already assigned to another family field
        const uniqueCandidates = familyNameLines.filter(n => !alreadyAssigned.has(n));
        console.log(`[PARSER] Family name unique candidates (after dedup):`, uniqueCandidates);

        if (uniqueCandidates.length > nameIdx && !result.fatherName) {
            result.fatherName = cleanRelativeName(titleCase(uniqueCandidates[nameIdx++]));
        }
        if (uniqueCandidates.length > nameIdx && !result.motherName) {
            result.motherName = cleanRelativeName(titleCase(uniqueCandidates[nameIdx++]));
        }
        if (uniqueCandidates.length > nameIdx && !result.spouseName) {
            result.spouseName = cleanRelativeName(titleCase(uniqueCandidates[nameIdx++]));
        }
    }

    // --- Old Passport No: look for alphanumeric tokens near "Old/Previous" ---
    if (!result.oldPassportNo) {
        for (let i = 0; i < lines.length; i++) {
            const up = lines[i].toUpperCase();
            if (up.includes('<')) continue;
            if (/(OLD|PREVIOUS|FORMER)\s*(PASSPORT|PP)\s*(NO|NUMBER)?/i.test(up)) {
                const m = up.match(/(?:OLD|PREVIOUS|FORMER)\s*(?:PASSPORT|PP)\s*(?:NO|NUMBER)?\s*[:\-]?\s*([A-Z0-9]{6,14})/i);
                if (m && m[1]) { result.oldPassportNo = m[1]; break; }
                if (i + 1 < lines.length) {
                    const nxtTokens = lines[i + 1].toUpperCase().match(/[A-Z0-9]{6,14}/g);
                    if (nxtTokens && nxtTokens.length) { result.oldPassportNo = nxtTokens[0]; break; }
                }
            }
        }
    }
}

module.exports = { extractSupplementalFields };
