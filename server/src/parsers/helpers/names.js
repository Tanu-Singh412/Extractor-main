const { ISO3 } = require('./countries');

const NAME_BAD_SUBSTR = ['DATE', 'DATS', 'EXPIR', 'HOLDER', 'SIGNAT', 'PASSPORT', 'PASSEPORT', 'PASAPORTE',
    'SURNAME', 'GIVEN', 'NATION', 'BIRTH', 'ISSUE', 'AUTHOR', 'REPUBLIC', 'KINGDOM', 'BRITAIN', 'IRELAND',
    'CITIZE', 'MUNICIP', 'RESIDEN', 'VALID', 'UNTIL', 'GOVERN', 'MINIST', 'AFFAIR', 'TRAVEL', 'DOCUM',
    'PLACE', 'GENDER', 'TITULAIRE', 'OBSERV', 'FIRST', 'LAST', 'MIDDLE', 'NAME', 'APARTMENT', 'APPARTMENT', 'ADDRESS', 'FATHER', 'MOTHER', 'SPOUSE', 'WIFE', 'HUSBAND', 'PINCODE',
    'PRENOM', 'PRMOM', 'SURMAM', 'APELLID', 'NOMBR', 'NAISSAN', 'DELIVRAN'];
const NAME_BAD_EXACT = new Set(['MR', 'MRS', 'MS', 'DR', 'PR', 'NO', 'NOM', 'NOMS', 'OF', 'THE', 'AND', 'DE',
    'DEL', 'VON', 'GB', 'UK', 'TYPE', 'CODE', 'SEX', 'DD', 'MMM', 'YYYY', 'HMPO', 'P', 'S', 'M', 'F', 'X',
    'NAME', 'NAMES', 'FIRST', 'LAST', 'GIVEN', 'SURNAME', 'SURNAMES', 'MID', 'MIDDLE', 'AYITI', 'HAITI', 'HAT', 'HTI', 'HTL', 'POURS', 'PAP', 'RES',
    'REPUBLIOUE', 'REPUBLIQUE', 'POLSKA', 'POLAND', 'RZECZPOSPOLITA', 'FOLOGHE', 'PIN', 'BLE',
    'PRMOM', 'PRENOM', 'PRENOMS', 'SURMAME', 'APELLIDOS', 'APELLIDO', 'NOMBRES', 'NOMBRE', 'NER', 'PACO', 'PICO',
    'NAISSANCE', 'DELIVRANCE', 'DILIVRANCE', 'DIFIVRANCE']);

function isNameToken(w) {
    if (!w || w.length < 2 || w.length > 30) return false;
    if (!/^[A-Z][A-Z'\-]*$/.test(w)) return false;
    if (/(.)\1{3,}/.test(w)) return false;               // AAAA-style OCR noise
    if (NAME_BAD_EXACT.has(w)) return false;
    if (w.length === 3 && ISO3.has(w)) return false;      // country code, name nahi
    if (w.length >= 4 && NAME_BAD_SUBSTR.some(b => w.includes(b))) return false;
    return true;
}

const cleanNameField = (s, rawText = '') => {
    const visTextUpper = String(rawText || '').split(/\r?\n/)
        .filter(l => !l.includes('<<') && !l.startsWith('P<') && !/^[A-Z0-9<]{28,}$/.test(l.replace(/\s/g, '')))
        .join(' ').toUpperCase();
    return String(s || '').toUpperCase().split(/[^A-Z'\-]+/).filter(isNameToken).map(w => {
        // Strip trailing MRZ filler chars
        const m = w.match(/^([A-Z]{2,}?)([CLKSEUOZ10<]{3,})$/);
        if (m && m[1].length >= 3) w = m[1];

        // Leading-C chevron fix: OCR reads '<<' as '<C', so givenNames get a spurious 'C' prefix
        // e.g. 'CANUBHAV' -> 'ANUBHAV' when visTextUpper has 'ANUBHAV'
        if (w.length >= 5 && w[0] === 'C') {
            const alt = w.slice(1);
            if (visTextUpper.includes(alt) && isNameToken(alt)) w = alt;
            else {
                const alt2 = alt.slice(0, -1);
                if (alt2.length >= 4 && visTextUpper.includes(alt2) && isNameToken(alt2)) w = alt2;
            }
        }
        // Leading-K chevron fix: OCR reads '<' as 'K'
        if (w.length >= 5 && w[0] === 'K') {
            const alt = w.slice(1);
            if (visTextUpper.includes(alt) && isNameToken(alt)) w = alt;
            else {
                const alt2 = alt.slice(0, -1);
                if (alt2.length >= 4 && visTextUpper.includes(alt2) && isNameToken(alt2)) w = alt2;
            }
        }

        // Visual mismatch trim — only trim last char if the full word is NOT already
        // a standalone plausible name token (all-alpha, >= 5 chars), to avoid wrongly
        // trimming e.g. ANUBHAV → ANUBHA just because OCR visual shows ANUBHAY
        if (visTextUpper && w.length >= 4 && !visTextUpper.includes(w)) {
            const trimmed = w.slice(0, -1);
            // Only trim if: trimmed form exists in visual text AND full word is short or ends in common OCR suffix
            const isOcrSuffix = /[YVBZ]$/.test(w);
            if (trimmed.length >= 3 && visTextUpper.includes(trimmed) && !isOcrSuffix) return trimmed;
        }
        if (w.length >= 4 && /[CSK10]$/.test(w)) {
            const trimmed = w.slice(0, -1);
            if (trimmed.length >= 3) return trimmed;
        }
        return w;
    }).join(' ').trim();
};

function reconcileNames(mrzName, visName, rawText = '') {
    const mrz = cleanNameField(mrzName, rawText);
    const vis = cleanNameField(visName, rawText);

    if (!mrz) return vis || '';
    if (!vis) return mrz || '';

    // Guard against dummy placeholder MRZ values
    if (/LOREM|IPSUM|MIPSUM|SPECIMEN|TRAVEL|DOCUMENT/.test(mrz)) return vis;

    if (mrz === vis) return mrz;
    // Handle single character OCR noise (e.g., MRZ "AGARWALS" vs Visual "AGARWAL")
    if (mrz.startsWith(vis) && mrz.length === vis.length + 1) return vis;
    if (vis.startsWith(mrz) && vis.length === mrz.length + 1) return mrz;

    if (mrz.includes(vis)) return mrz;
    if (vis.includes(mrz)) return vis;

    if (mrz.length >= vis.length) return mrz;
    return vis;  
}

module.exports = { NAME_BAD_EXACT, isNameToken, cleanNameField, reconcileNames };
