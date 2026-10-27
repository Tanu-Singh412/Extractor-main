const hasMrzText = (t) => String(t || '').split(/\r?\n/)
    .some(l => l.replace(/[^A-Za-z0-9<«]/g, '').length >= 36 && /<|«/.test(l))
    || /P</.test(t || '');

const normLine = (l) => l.toUpperCase().replace(/[^A-Z0-9]/g, '');
function mergeNovelLines(baseText, extraText) {
    const baseSet = [...new Set(baseText.split(/\r?\n/).map(normLine).filter(Boolean))];
    const novel = extraText.split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(l => {
        const n = normLine(l);
        if (n.length < 3) return false;
        return !baseSet.some(b => b === n || b.includes(n) || n.includes(b));
    });
    return novel.length ? baseText + '\n' + novel.join('\n') : baseText;
}

function scoreOcrText(t) {
    if (!t) return -Infinity;
    const str = String(t);
    const upper = str.toUpperCase();
    let score = 0;

    // Passport signals
    if (/P<[A-Z]{3}/.test(upper)) score += 100;
    if (/[0-9A-Z<]{9}[0-9<][A-Z]{3}[0-9A-Z<]{6}/.test(upper)) score += 80;
    if (/PASSPORT|PASSEPORT|REPUBLIC\s*OF/i.test(upper)) score += 40;

    // Insurance signals
    if (/(?:POLICY|CERTIFICATE)\s*(?:NO\.?|NUMBER|#)/i.test(upper)) score += 90;
    if (/(?:INSURANCE|ASSURANCE|COVERAGE|PERIOD\s*OF\s*INSURANCE)/i.test(upper)) score += 60;
    if (/(?:REGISTRATION\s*NO|ENGINE\s*NO|CHASSIS\s*NO|VEHICLE\s*NO)/i.test(upper)) score += 70;
    if (/(?:PREMIUM|SUM\s*INSURED|INSURED\s*NAME|BENEFICIARY)/i.test(upper)) score += 50;

    // Dates
    const dateMatches = str.match(/\b(?:\d{1,2}[\/\-. ](?:[A-Za-z]{3,9}|\d{1,2})[\/\-. ]\d{2,4}|\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/g);
    if (dateMatches) score += Math.min(dateMatches.length * 15, 60);

    // Document length signal (enough content to extract fields)
    if (str.replace(/\s/g, '').length >= 300) score += 30;

    // Noise penalty
    const noise = (str.match(/[{}\[\]~`_§¶]/g) || []).length;
    score -= noise * 2;
    return score;
}

module.exports = { hasMrzText, mergeNovelLines, scoreOcrText };
