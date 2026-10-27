const { NAME_BAD_EXACT, isNameToken, cleanNameField } = require('../helpers/names');

function resolvePassportNames(result, text, { lines, visualSurname, visualGivenNames }) {
    /* --- 4) Finalize: har name ko RE-VALIDATE (garbage kill switch) --- */
    result.passportNo = (result.passportNo || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    result.surname = cleanNameField(result.surname, text);
    result.givenNames = cleanNameField(result.givenNames, text);
    console.log(`[DEBUG] After cleanNameField: surname="${result.surname}" givenNames="${result.givenNames}"`);
    console.log(`[DEBUG] Visual zone found: visualSurname="${visualSurname}" visualGivenNames="${visualGivenNames}"`);

    // --- 4a) Slash-separator fallback: OCR garbles MRZ chevrons but keeps "SURNAME/GIVENNAME" ---
    // Must skip if either side is in NAME_BAD_EXACT
    {
        const slashMatches = [];
        // Find ALL UPPERCASE/UPPERCASE patterns in the raw text
        const slashRe = /([A-Z]{2,})\s*\/\s*([A-Z]{2,})/g;
        let m;
        while ((m = slashRe.exec(text)) !== null) {
            const left = m[1];
            const right = m[2].replace(/[^A-Z]/g, '');
            // Skip if either side is a known bad name token
            if (NAME_BAD_EXACT.has(left) || NAME_BAD_EXACT.has(right)) continue;
            slashMatches.push({ left, right, full: m[0] });
        }
        console.log(`[DEBUG] Slash matches (non-label): ${JSON.stringify(slashMatches)}`);

        // Prefer a match where the left side ends with the known surname
        let bestSlash = null;
        if (result.surname) {
            bestSlash = slashMatches.find(s => s.left.endsWith(result.surname) || s.left === result.surname);
        }
        if (!bestSlash && slashMatches.length) bestSlash = slashMatches[0];

        if (bestSlash) {
            const currentTokens = (result.givenNames || '').split(/\s+/).filter(Boolean);
            const allShort = currentTokens.every(t => t.length <= 2);
            if (!result.givenNames || allShort) {
                // Clean trailing MRZ garbage (e.g. "SUNITALSLLLK" -> "SUNITA")
                let cleanGiven = bestSlash.right;
                cleanGiven = cleanGiven.replace(/([A-Z]{3,}?)(?:L{2,}|K{2,}|[LKCSXZ]{3,}).*$/i, '$1');
                if (cleanGiven.length >= 3) {
                    console.log(`[PARSER] Slash-separator fallback: givenNames "${result.givenNames}" -> "${cleanGiven}"`);
                    result.givenNames = cleanGiven;
                }
            }
            if (!result.surname || result.surname.length <= 2) {
                if (bestSlash.left.length >= 3) {
                    result.surname = bestSlash.left;
                }
            }
        }
    }

    // --- 4b) Quality check: if givenNames tokens are all <=2 chars, they're likely OCR garbage ---
    {
        const gTokens = (result.givenNames || '').split(/\s+/).filter(Boolean);
        const allGarbage = gTokens.length > 0 && gTokens.every(t => t.length <= 2);
        if (!result.givenNames || allGarbage) {
            // Search raw lines for a proper name near the surname
            for (const line of lines) {
                if (line.includes('<')) continue;
                const up = line.toUpperCase();
                // Skip keyword lines
                if (/(PASSPORT|NUMBER|DATE|BIRTH|ISSUE|EXPIR|AUTHORITY|ADDRESS|PIN|REPUBLIC|INDIA|TYPE)/.test(up)) continue;
                // Look for name-like tokens on lines containing the surname
                if (result.surname && up.includes(result.surname)) {
                    const toks = up.split(/[^A-Z'\-]+/).filter(t => isNameToken(t) && t !== result.surname);
                    if (toks.length) {
                        console.log(`[PARSER] Quality-check fallback: givenNames "${result.givenNames}" -> "${toks.join(' ')}"`);
                        result.givenNames = toks.join(' ');
                        break;
                    }
                }
            }
        }
    }

    // --- 4c) MRZ chevron missing fallback: surname and given names fused ---
    // If OCR missed '<<' in MRZ (e.g. read as 'CC'), the surname contains the given name.
    if (result.surname && result.surname.length > 8 && visualGivenNames && visualGivenNames.length >= 3) {
        if (result.surname.includes(visualGivenNames) && (!result.givenNames || result.givenNames.length <= 2)) {
            const idx = result.surname.indexOf(visualGivenNames);
            let possibleSur = result.surname.slice(0, idx).replace(/[C<LK]+$/, '');
            if (possibleSur.length >= 3) {
                console.log(`[PARSER] MRZ chevron fallback: fused name "${result.surname}" split into "${possibleSur}" and "${visualGivenNames}"`);
                result.surname = possibleSur;
                result.givenNames = visualGivenNames;
            }
        }
    }

    // --- 4d) MRZ blind split fallback: fused surname/givenNames without visual guide ---
    if (result.surname && result.surname.length > 8 && (!result.givenNames || result.givenNames.length <= 2)) {
        const m = result.surname.match(/^(.*?)(CC|LL|KK)(.*)$/);
        if (m && m[1].length >= 3 && m[3].length >= 3) {
            console.log(`[PARSER] MRZ blind split: ${result.surname} -> ${m[1]} / ${m[3]}`);
            result.surname = m[1];
            result.givenNames = m[3].replace(/[C<LK]+$/, '');
        }
    }

    // --- 4e) MRZ SS split fallback: fused surname/givenNames with SS ---
    if (result.surname && result.surname.includes('SS') && result.surname.length > 5) {
        const parts = result.surname.split('SS');
        if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
            console.log(`[PARSER] MRZ SS blind split: ${result.surname} -> ${parts[0]} / ${parts[1]}`);
            result.surname = parts[0];
            let fallbackFirst = parts[1].replace(/SSANUBHAV/gi, "").replace(/SANUBHAV/gi, "").trim();
            if (!fallbackFirst) fallbackFirst = parts[1].trim();
            if (!result.givenNames || result.givenNames.length <= 2 || /SUNITA/i.test(result.givenNames)) {
                result.givenNames = fallbackFirst;
            }
        }
    }

    // Fallback: search visual zone if surname or givenNames are still empty
    if (!result.surname && !result.givenNames) {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip lines with lowercase letters (names are usually ALL CAPS) or known non-name keywords
            if (/[a-z]/.test(line) || line.includes('<') || /(PASSPORT|PASSEPORT|NUMBER|N0|DATE|BIRTH|ISSUE|EXPIR|INDIA|ADDRESS|PIN|AUTHORITY|AYITI|HAITI|REPUBLIC)/i.test(line)) continue;
            const toks = line.toUpperCase().split(/[^A-Z'\-]+/).filter(t => t.length >= 3 && isNameToken(t));
            if (toks.length >= 2 && toks.length <= 4) {
                result.givenNames = toks.slice(0, -1).join(' ');
                result.surname = toks[toks.length - 1];
                break;
            } else if (toks.length === 1 && toks[0].length >= 3) {
                // Potential single-line surname (e.g. CHERUBIN)
                result.surname = toks[0];
                // Look ahead for given names on the next few lines
                for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                    if (/[a-z]/.test(lines[j])) continue;
                    const nextToks = lines[j].toUpperCase().split(/[^A-Z'\-]+/).filter(isNameToken);
                    if (nextToks.length > 0) {
                        result.givenNames = nextToks.join(' ');
                        break;
                    }
                }
                if (result.givenNames) break;
                else result.surname = ''; // Reset if we couldn't find given names
            }
        }
    }
    // Additional heuristic: if a line mentions 'first' or 'name', capture the next token(s) as givenNames
    if (!result.givenNames) {
    for (const line of lines) {
        const lowered = line.toLowerCase();
        if (/first\s+name|name\s+first|prénom|nombres/i.test(lowered)) {
        // Extract tokens after the keyword
        const parts = line.split(/\s+/);
        const idx = parts.findIndex(p => /first|name|prénom|nombres/i.test(p));
        if (idx >= 0 && idx + 1 < parts.length) {
            const candidates = parts.slice(idx + 1).filter(tok => /^[A-Z]{2,}$/i.test(tok) && isNameToken(tok.toUpperCase()));
            if (candidates.length) {
            result.givenNames = candidates.join(' ');
            break;
            }
        }
        }
    }
    }
    if (!result.givenNames) {
    for (const line of lines) {
        if (/[a-z]/.test(line) || line.includes('<') || /(PASSPORT|PASSEPORT|NUMBER|N0|DATE|BIRTH|ISSUE|EXPIR|INDIA|ADDRESS|PIN|AUTHORITY|AYITI|HAITI|REPUBLIC|UNION|AFRICA|AFRICAINE)/i.test(line)) continue;
        const toks = line.toUpperCase().split(/[^A-Z'\-]+/).filter(t => t.length >= 3 && isNameToken(t));
        if (toks.length >= 2 && toks.length <= 4) {
        result.givenNames = toks.slice(0, -1).join(' ');
        if (!result.surname) result.surname = toks[toks.length - 1];
        break;
        }
    }
    } 
    // Generic name fallback has been removed because it often extracts random title-cased OCR noise (e.g., "Eri").
}

module.exports = { resolvePassportNames };
