const { firstDateIn } = require('../helpers/dates');
const { cleanAddress, cleanRelativeName, correctIndianPassportNumber } = require('../helpers/fields');
const { normCountry } = require('../helpers/countries');
const { isNameToken } = require('../helpers/names');

const PARTICLES = new Set(['DE', 'LA', 'LE', 'DI', 'DA', 'VAN', 'VON', 'DEL', 'DOS', 'SAN', 'MAC', 'MC']);


function extractVisualFields(result, text) {
    /* --- 2) Visual zone --- */
    const lines = text.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const nextLine = (i) => (lines[i + 1] || '').toUpperCase();
    const alnumTokens = (s) => String(s).toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const looksLikeDocNo = (t) => /^[A-Z0-9]{6,14}$/.test(t) && /\d/.test(t);
    let visualSurname = '', visualGivenNames = ''; // existing visual name vars
    let extraFields = { fatherName: '', motherName: '', spouseName: '', oldPassportNo: '', placeOfIssue: '', fileNo: '', placeOfBirth: '' };

    for (let i = 0; i < lines.length; i++) {
        const up = lines[i].toUpperCase();
        if (up.includes('<')) continue; // MRZ line skip

        // Enhanced passport number detection (visual zone)
        if (/(PASSPORT|PASSEPORT|PASAPORTE|DOCUMENT|PASPO|PASPÒ|PSSEPORT|PN|PASS\s*NO|PASS-?NO|PAS|PNO)[^.]{0,20}(NO\.?|NUMBER|N0\.?|NUM|#|NIMEWO|NO|N0)/i.test(up)) {
            const cand = alnumTokens(up).filter(looksLikeDocNo).pop()
                || alnumTokens(nextLine(i)).filter(looksLikeDocNo)[0] || '';
            if (cand) {
                const cleaned = cand.replace(/[^A-Z0-9]/gi, '').toUpperCase();
                if (!result.passportNo) result.passportNo = cleaned;
                else if (cleaned !== result.passportNo && cleaned.startsWith(result.passportNo)
                         && cleaned.length <= result.passportNo.length + 3) {
                    console.log(`[PARSER] Passport no extended (visual): ${result.passportNo} -> ${cleaned}`);
                    result.passportNo = cleaned;
                }
            }
        }
        // ---- NEW: Extra field extraction -------------------------------------------------
            // Address (Keyword-based multi-line extraction – requires explicit label)
            // Address (Keyword-based multi-line extraction – requires explicit label)
            if (!result.address && /(?:ADDRESS|RESIDENCE)\s*[:\-]?/i.test(up) && !/(EMAIL|WEBSITE)/i.test(up)) {
                const addrMatch = up.match(/(?:ADDRESS|RESIDENCE)\s*[:\-]?\s*(.*)/i);
                let currentAddrLines = [];
                if (addrMatch && addrMatch[1].trim()) {
                    const firstPart = addrMatch[1].trim();
                    if (firstPart.length > 2 && /[A-Za-z0-9]{3,}/.test(firstPart)) currentAddrLines.push(firstPart);
                }
                for (let k = 1; k <= 6; k++) {
                    const nxt = lines[i + k];
                    if (!nxt) break;
                    const nxtUp = nxt.toUpperCase();
                    if (nxtUp.includes('<')) break;
                    if (/(PASSPORT|DOB|ISSUE|EXPIR|NATIONALIT|SEX|FATHER|MOTHER|SPOUSE|PLACE\s*OF\s*BIRTH|FILE\s*NO|OLD\s*PASSPORT)/i.test(nxtUp)) break;
                    if (nxt.trim().length < 3) continue;

                    // Filter out lines that are background security print noise (no address keywords and no substantial alpha tokens)
                    const cleanTokens = nxt.replace(/[^A-Za-z0-9]/g, ' ').split(/\s+/).filter(Boolean);
                    const hasAddressKeyword = /(GALI|ROAD|COLONY|NAGAR|SECTOR|HOUSE|FLAT|APARTMENT|VILLAGE|PO|TEHSIL|DISTT|DISTRICT|NEAR|POST|PIN|\d{6}|INDIA|PRADESH|DELHI|STREET|LANE|MARG|FLOOR|BLOCK|NO\b)/i.test(nxtUp);
                    const longWords = cleanTokens.filter(w => w.length >= 4);
                    if (!hasAddressKeyword && longWords.length < 2) continue;

                    currentAddrLines.push(nxt.trim());
                    // If this line contains PIN code or country, it marks the end of the address
                    if (/\b(?:PIN\s*:?\s*)?\d{6}\b/.test(nxtUp) || /INDIA\b/.test(nxtUp)) {
                        break;
                    }
                }
                if (currentAddrLines.length > 0) {
                    const rawAddr = currentAddrLines.join(', ');
                    const cleanedAddr = rawAddr
                        .replace(/[^\w\s,.\/-]/g, '')
                        .replace(/\s+,/g, ',')
                        .replace(/,+/g, ', ')
                        .replace(/[()\\]/g, '')
                        .replace(/\s{2,}/g, ' ')
                        .trim();
                    result.address = cleanAddress(cleanedAddr);
                }
            }
            const isKeyword = (s) => /(FATHER|MOTHER|SPOUSE|MARRIED|OLD|PREVIOUS|PASSPORT|FILE|DOCUMENT|NO\b|PLACE|ISSUE|EXPIR|ADDRESS|PIN|DATE|NAME|BIRTH)/.test(s);

            // Place of Birth
            if (!extraFields.placeOfBirth && /(?:PLACE|PACO|PICO)\s*OF\s*BIRTH|LIEU\s*DE\s*NAISSANCE|LISU\s*D[EÉ]\s*NAISS/i.test(up)) {
                let val = up.replace(/.*(?:PLACE|PACO|PICO)\s*OF\s*BIRTH[^\w]*/i, '')
                            .replace(/(?:LIEU|LISU)\s*D[EÉ]?\s*NAISS\w*[^\w]*.*/i, '')
                            .replace(/[^A-Z\s,]/g, '').trim();
                if (val.length < 3 || /^(CEE|SH|NAISS\w*|LISU|LIEU)$/i.test(val)) val = '';
                if (val.length >= 3) {
                    extraFields.placeOfBirth = val.replace(/\s{2,}/g, ' ').trim();
                } else {
                    const nxt = (lines[i + 1] || '').toUpperCase();
                    const words = nxt.replace(/[^A-Z\s,]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !/(?:DATE|ISSUE|SEX|BIRTH|NAISS|PACO|PICO|LIEU|LISU)/i.test(w));
                    if (words.length > 0) {
                        extraFields.placeOfBirth = words.slice(0, 4).join(' ');
                    }
                }
            }
            // Father name (also detect garbled OCR: "Mam of Fa", "Name of Father", "Fo' a", "Fath",
            // "Kas of Ft", "PRT 1 Kas of Ft", "Geir sa ULL", "Name of Fat" etc.)
            const FATHER_LABEL_GARBAGE = /^(?:LEGAL\s*GUARDIAN|LEGAL|GUARDIAN|NAME|FA|FT|FATH|OF|FATHER|NOM)$/i;
            if (!extraFields.fatherName && /(FATHER|FATH[A-Z]*\s*(?:NAME)?|MAM\s*OF\s*FA|FO.?\s*A|KAS\s*OF\s*FT|GEIR\s*SA|NIVE\s*OF\s*FA|NAME\s*OF\s*FAT)/i.test(up)) {
                // First check if the NEXT line contains the father's name (standard on Indian passports)
                let foundNext = false;
                for (let j = 1; j <= 2; j++) {
                    const nxt = (lines[i + j] || '').toUpperCase();
                    if (isKeyword(nxt) || nxt.includes('<')) break;
                    const cleaned = nxt.replace(/[^A-Z\s]/gi, '').trim();
                    const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
                    if (words.length >= 2 && !FATHER_LABEL_GARBAGE.test(cleaned)) {
                        extraFields.fatherName = cleanRelativeName(cleaned);
                        foundNext = true;
                        break;
                    }
                }
                if (!foundNext) {
                    const m = up.match(/(?:FATHER|FATH[A-Z]*)(?:\s*(?:NAME|\/\s*LEGAL\s*GUARDIAN))?\s*[:]?\s*(.*)/i);
                    let captured = m && m[1] ? m[1].replace(/[^A-Z\s]/gi, '').trim() : '';
                    captured = captured.replace(/^(?:LEGAL\s*GUARDIAN|GUARDIAN)\b/i, '').trim();
                    const words = captured.split(/\s+/).filter(w => w.length >= 4);
                    if (words.length >= 2 && !FATHER_LABEL_GARBAGE.test(captured)) {
                        extraFields.fatherName = cleanRelativeName(captured);
                    }
                }
            }
            // Mother name — also catches garbled OCR variants:
            // "Nive of Motes", "Name of Mothr", "Mime of Modher", "MOTHE", "MOTES", "NIVE OF MO"
            const MOTHER_PATTERN = /(MOTHER|MODHER|MOTHE[RS]?|MOTES|MOTHR|NIVE\s+OF\s+MO|NAME\s+OF\s+MO|MIME\s+OF)/i;
            if (!extraFields.motherName && MOTHER_PATTERN.test(up)) {
                let foundNext = false;
                for (let j = 1; j <= 2; j++) {
                    const nxt = (lines[i + j] || '').toUpperCase();
                    if (isKeyword(nxt) || nxt.includes('<')) break;
                    const cleaned = nxt.replace(/[^A-Z\s]/gi, '').trim();
                    const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
                    if (words.length >= 2) {
                        extraFields.motherName = cleanRelativeName(cleaned);
                        foundNext = true;
                        break;
                    }
                }
                if (!foundNext) {
                    const m = up.match(/(?:MOTHER|MODHER|MOTHE[RS]?|MOTES|MOTHR|NIVE\s+OF\s+MO|NAME\s+OF\s+MO|MIME\s+OF)(?:[^A-Z]*(?:NAME|AVES|ARES))?\s*[:]?\s*(.*)/i);
                    const captured = m && m[1] ? m[1].replace(/[^A-Z\s]/gi, '').trim() : '';
                    const words = captured.split(/\s+/).filter(w => w.length >= 4);
                    if (words.length >= 2) {
                        extraFields.motherName = cleanRelativeName(captured);
                    }
                }

                // --- Positional father name heuristic ---
                // Indian passport back page order: Father → Mother → Spouse
                // If we found the Mother line, look backwards for a name-like line
                if (!extraFields.fatherName) {
                    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
                        const prevLine = lines[j].toUpperCase();
                        if (prevLine.includes('<')) continue;
                        // Skip if it looks like a keyword/label line
                        if (/(FATHER|FATH|MOTHER|MODHER|MOTHE|MOTES|SPOUSE|SASS|SPOASS|PASSPORT|DATE|BIRTH|ISSUE|EXPIR|ADDRESS|PIN|NAME\s*OF|NIVE\s*OF|MIME\s*OF|REPUBLIC|KAS\s*OF)/.test(prevLine)) continue;
                        // Clean the line and check if it looks like a name (2-4 alpha tokens, each 4+ chars, at least one 5+ chars)
                        const cleaned = prevLine.replace(/[^A-Z\s]/g, '').trim();
                        const tokens = cleaned.split(/\s+/).filter(t => t.length >= 4 && /^[A-Z]+$/.test(t));
                        const hasLongToken = tokens.some(t => t.length >= 5);
                        if (tokens.length >= 2 && tokens.length <= 4 && hasLongToken) {
                            console.log(`[PARSER] Father name via positional heuristic (line ${j}, before mother at ${i}): ${tokens.join(' ')}`);
                            extraFields.fatherName = tokens.join(' ');
                            break;
                        }
                    }
                }
            }
            // Spouse name — catches garbled OCR label line like 'fa ame Spots Le f'
            // Keywords: SPOTS, SPOUS, SPOASS, SASS, FA AME, AME SPO etc.
            const SPOUSE_PATTERN = /(SPOUSE|MARRIED\s*TO|SASS|SPOASS|SPOAS[A-Z]*|SPOUSA|SPOTS|SPOUS|PEI\s+OT\s+SP|AME\s+SPOT|NAME\s+OF\s+SP|FA\s+AME|AME\s+SPO)/i;
            const SPOUSE_LABEL_GARBAGE = /^(SPOTS|SPOUS|SPOA|SASS|LE|LA|F|FA|AME|IE|SP|LI|LE\s*F)$/i;
            if (!extraFields.spouseName && SPOUSE_PATTERN.test(up)) {
                let foundNext = false;
                for (let j = 1; j <= 2; j++) {
                    const nxt = (lines[i + j] || '').toUpperCase();
                    if (isKeyword(nxt) || nxt.includes('<')) break;
                    const cleaned = nxt.replace(/[^A-Z\s]/gi, '').trim();
                    const words = cleaned.split(/\s+/).filter(w => w.length >= 3);
                    if (words.length >= 2 && !SPOUSE_LABEL_GARBAGE.test(cleaned)) {
                        extraFields.spouseName = cleanRelativeName(cleaned);
                        foundNext = true;
                        break;
                    }
                }
                if (!foundNext) {
                    const m = up.match(/(?:SPOUSE|MARRIED\s*TO|SASS|SPOASS|SPOAS[A-Z]*|SPOUSA|SPOTS|SPOUS|PEI\s+OT\s+SP|AME\s+SPOT|NAME\s+OF\s+SP|FA\s+AME|AME\s+SPO)\s*[^A-Z]*[:]?\s*(.*)/i);
                    const rawCapture = m && m[1] ? m[1].replace(/[^A-Z\s]/gi, '').trim() : '';
                    const tokens = rawCapture.split(/\s+/).filter(t => t.length >= 4);
                    if (tokens.length >= 2 && !SPOUSE_LABEL_GARBAGE.test(rawCapture)) {
                        extraFields.spouseName = cleanRelativeName(rawCapture);
                    }
                }
            }
            // Old passport number (allow Pasion, or garbled "TRE St", "id sors", "Face se ERE" for "Old Passport No. with Date and Place of Issue")
            if (!extraFields.oldPassportNo && /(?:OLD|PREVIOUS|PASION|TRE\s*ST|ID\s*SORS|FACE\s*SE)\s*(?:PASSPORT|MO|NO|WITH|ITH)?/i.test(up)) {
                const cleanUp = up.replace(/(?:OLD|PREVIOUS|PASION|TRE\s*ST|ID\s*SORS|FACE\s*SE)\s*(?:PASSPORT|MO|NO|WITH|ITH)?\s*(?:DATE|AND|PLACE|OF|ISSUE)*/gi, '').trim();
                const inlineTokens = cleanUp.split(/[^A-Z0-9]+/).filter(t => t.length >= 7 && t.length <= 10 && /\d{4,}/.test(t) && !/PASSPORT/i.test(t));
                if (inlineTokens.length > 0) {
                    extraFields.oldPassportNo = correctIndianPassportNumber(inlineTokens[0]);
                } else {
                    const nxtTokens = nextLine(i).split(/[^A-Z0-9]+/).filter(t => t.length >= 7 && t.length <= 10 && /\d{4,}/.test(t) && !/PASSPORT/i.test(t));
                    if (nxtTokens.length > 0) extraFields.oldPassportNo = correctIndianPassportNumber(nxtTokens[0]);
                }
            }
            // Place of issue
            if (!extraFields.placeOfIssue && /(?:PLACE|PLACOO?T?)\s*OF\s*ISSUE|LIEU\s*DE\s*D[EÉ]LIVRANCE|LICU\s*DE\s*DIIVRANCE/i.test(up)) {
                let val = up.replace(/.*(?:PLACE|PLACOO?T?)\s*OF\s*ISSUE[^\w]*/i, '')
                            .replace(/(?:LIEU|LICU)\s*DE\s*D[EÉI]+VRANCE[^\w]*.*/i, '')
                            .replace(/[^A-Z\s]/g, '').trim();
                if (val.length >= 4 && !/^(ILICU|DIIVRANCE|LICU|DIFIVRANCE)$/i.test(val)) {
                    extraFields.placeOfIssue = val;
                } else {
                    const nxt = (lines[i + 1] || '').toUpperCase();
                    const words = nxt.replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !/(?:ISSUE|DATE|DELIVRANCE|PASSPORT|CANADA|DIIVRANCE)/i.test(w));
                    if (words.length > 0) {
                        extraFields.placeOfIssue = words[0];
                    }
                }
            }
            // File number
            if (!extraFields.fileNo && /(FILE|DOCUMENT)\s*NO\.?/i.test(up)) {
                const m = up.match(/(?:FILE|DOCUMENT)\s*NO\.?\s*[:]?\s*([A-Z0-9]{3,16})/i);
                if (m && m[1]) extraFields.fileNo = m[1].trim();
                else { const nxt = (nextLine(i).match(/[A-Z0-9]{3,16}/) || [])[0]; if (nxt) extraFields.fileNo = nxt; }
            }
            // -----------------------------------------------------------------------------
        if (!visualSurname && /(?:SURNAME|FAMILY\s*NAME|APELLIDOS|SURMAME|SURIREME|NOM\b|NOMS\b)/i.test(up)) {
            let seg = (up.match(/(?:SURNAME|FAMILY\s*NAME|APELLIDOS|SURMAME|SURIREME)\s*[:.\/\-]?\s*(.*)$/i) || [])[1] || '';
            seg = seg.replace(/^[/:.\-\s]*(?:NOM|NER|APELLIDOS|PRENOM|PRMOM)\b[^\w]*/i, '').trim();
            let toks = seg.split(/[^A-Z'\-]+/).filter(isNameToken);
            const nxtToks = alnumTokens(nextLine(i)).filter(isNameToken);
            if (!toks.length || (toks[0].length <= 2 && nxtToks.length && nxtToks[0].length >= 3)) {
                toks = nxtToks;
            }
            if (toks.length) visualSurname = PARTICLES.has(toks[0]) && toks[1] ? `${toks[0]} ${toks[1]}` : toks[0];
        }
        if (!visualGivenNames && /(?:GIVEN\s*NAMES?|FIRST\s*NAME|PRENOMS?|PRMOM|NOMBRES)/i.test(up)) {
            let seg = up.replace(/^.*?(?:GIVEN\s*NAMES?|FIRST\s*NAME|PRENOMS?|PRMOM|NOMBRES)\s*[:.\/\-]?\s*/i, '');
            seg = seg.replace(/^(?:PRENOM|PRMOM|PRENOMS|NOMBRES)\b[^\w]*/i, '').replace(/[^A-Z\s]/g, '').trim();
            let toks = seg.split(/[^A-Z'\-]+/).filter(isNameToken);
            if (!toks.length) toks = alnumTokens(nextLine(i)).filter(isNameToken);
            if (!toks.length && lines[i + 2]) toks = alnumTokens(lines[i + 2].toUpperCase()).filter(isNameToken);
            if (toks.length) visualGivenNames = toks.slice(0, 4).join(' ');
        }
        if (!result.nationality && /(NATIONALIT|NACIONALIDAD|CITIZENSHIP|CITIZEN)/.test(up)) {
            const m = up.match(/(?:NATIONALIT\w*|NACIONALIDAD|CITIZENSHIP|CITIZEN)\s*[:\-\/]?\s*([A-Z]{3}\b|[A-Z\s]{4,30})/);
            if (m) {
                result.nationality = normCountry(m[1].trim());
            } else {
                const cm = up.match(/([A-Z]{2,})\s+CITIZEN/);
                if (cm) result.nationality = normCountry(cm[1].trim());
            }
        }
        if (!result.sex && /\b(SEX|GENDER|SEXE)\b/.test(up)) {
            const m = up.match(/\b(?:SEX|GENDER|SEXE)\b\s*[:\-\/]?\s*\b(M|F|MALE|FEMALE|X)\b/);
            if (m) result.sex = m[1][0];
        }

        // Date of Issue multi-line check (up to 3 lines ahead), skipping OLD / PREVIOUS passport lines
        if (!result.issueDate && /(ISSUE|ISSUED|DELIVER|DELI|ISSUED?\s*DATE|DATE\s*OF\s*ISSUE|OFFICE\s*OF\s*ISSUE)/.test(up)) {
            if (!/(OLD|PREVIOUS|FILE\s*NO)/.test(up)) {
                for (let offset = 0; offset <= 3; offset++) {
                    if (i + offset < lines.length) {
                        const lineContent = lines[i + offset].toUpperCase();
                        if (/(OLD|PREVIOUS|FILE\s*NO)/.test(lineContent)) continue;
                        const candDate = firstDateIn(lineContent);
                        if (candDate && candDate !== result.dob && candDate !== result.doe) {
                            result.issueDate = candDate;
                            break;
                        }
                    }
                }
            }
        }

        // Date of Expiry multi-line check
        if (!result.doe && /(EXPIR|VALID\s*(?:UNTIL|TO|THRU))/.test(up)) {
            for (let offset = 0; offset <= 3; offset++) {
                if (i + offset < lines.length) {
                    const candDate = firstDateIn(lines[i + offset]);
                    if (candDate && candDate !== result.dob) {
                        result.doe = candDate;
                        break;
                    }
                }
            }
        }

        // Date of Birth multi-line check (strictly requires date/DOB signal and excludes place of birth lines)
        if (!result.dob && /(?:DATE\s*OF\s*B(?:IRTH|IFH|EY|INTH|IIV)|DATE\s*DE\s*NA(?:ISSANCE|LSSANCE)|D\.?O\.?B\.?|OATEORBI|OATE\s*OF\s*B|\bDOB\b)/i.test(up) && !/(?:PLACE|PACO|PICO|LIEU|LISU)/i.test(up)) {
            for (let offset = 0; offset <= 2; offset++) {
                if (i + offset < lines.length) {
                    const candDate = firstDateIn(lines[i + offset]);
                    if (candDate) {
                        result.dob = candDate;
                        break;
                    }
                }
            }
        }
    }

    if (!extraFields.fileNo) {
        const fm = text.match(/\b([A-Z]{2}[0-9]{13})\b/);
        if (fm) extraFields.fileNo = fm[1];
    }

    return { lines, visualSurname, visualGivenNames, extraFields };
}

module.exports = { extractVisualFields };
