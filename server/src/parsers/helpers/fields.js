function titleCase(s) { return String(s || '').toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()); }

/** Clean OCR-noisy address: strip stray short fragments, collapse whitespace/commas */
function cleanAddress(s) {
    if (!s) return '';
    return String(s)
        .replace(/[<>\\]/g, '')            // remove stray angle-brackets and backslashes
        .replace(/\b[a-z]{1,3}\b/g, '')    // drop isolated 1-3 lowercase-only tokens (OCR noise like "his", "i", "wn", "el")
        .replace(/\(\s*/g, '').replace(/\s*\)/g, '') // remove parentheses
        .replace(/,+/g, ',')               // collapse multiple commas
        .replace(/,\s*,/g, ',')             // remove empty comma segments
        .replace(/^[\s,]+|[\s,]+$/g, '')    // trim leading/trailing commas and spaces
        .replace(/\s+/g, ' ')               // collapse whitespace
        .trim();
}

/* Strip short (≤3-char) trailing OCR-garbage tokens from family name fields.
   e.g. "Dinesh Kumar Agarwal Aie" → "Dinesh Kumar Agarwal"
        "Asha Agarwal Tis"         → "Asha Agarwal"          */
function cleanRelativeName(s) {
    if (!s) return s;
    let str = s.replace(/[^A-Za-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const words = str.split(/\s+/).filter(Boolean);
    const labelWords = new Set(['NAME', 'OF', 'FATHER', 'MOTHER', 'SPOUSE', 'LEGAL', 'GUARDIAN', 'LEGA']);
    
    // Strip leading noise words or short artifacts (like "HV", "SE")
    while (words.length > 2) {
        const first = words[0].toUpperCase();
        if (labelWords.has(first) || first.length <= 2) {
            words.shift();
        } else {
            break;
        }
    }

    // Remove trailing tokens that are suspiciously short (≤3 chars) or label leftovers
    while (words.length > 2) {
        const last = words[words.length - 1].toUpperCase();
        if (labelWords.has(last) || last.length <= 3) {
            words.pop();
        } else {
            break;
        }
    }
    return words.join(' ');
}

function mergeFill(target, src) {
    if (!src) return target;
    for (const k of Object.keys(src)) {
        if ((target[k] === '' || target[k] == null) && src[k] != null && String(src[k]).trim() !== '') {
            target[k] = String(src[k]).trim();
        }
    }
    return target;
}

function correctIndianPassportNumber(str) {
    if (!str || str.length < 7 || str.length > 9) return str;
    const digitMap = { 'O': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'G': '6', 'T': '7', 'B': '8', 'Y': '4', 'A': '4', 'D': '0' };
    const chars = str.split('');
    for (let i = 1; i < chars.length; i++) {
        if (/[A-Z]/.test(chars[i]) && digitMap[chars[i]]) {
            chars[i] = digitMap[chars[i]];
        }
    }
    return chars.join('');
}

module.exports = { titleCase, cleanAddress, cleanRelativeName, mergeFill, correctIndianPassportNumber };
