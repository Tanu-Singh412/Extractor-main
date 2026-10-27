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
    let score = 0;
    if (/P<[A-Z]{3}/.test(t)) score += 100;
    if (/[0-9A-Z<]{9}[0-9<][A-Z]{3}[0-9A-Z<]{6}/.test(t)) score += 80;
    const dateMatches = t.match(/\d{1,2}[\/\-\.][\d{1,2}[\/\-\.][\d{2,4}]/g);
    if (dateMatches) score += dateMatches.length * 15;
    const noise = (t.match(/[{}\[\]~`_]/g) || []).length;
    score -= noise * 2;
    return score;
}

module.exports = { hasMrzText, mergeNovelLines, scoreOcrText };
