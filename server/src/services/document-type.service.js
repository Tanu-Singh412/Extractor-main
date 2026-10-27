function detectDocType(text) {
    const t = String(text || '').toUpperCase();
    const passportScore = (t.match(/P<[A-Z]{3}/g) || []).length * 5
        + (t.includes('PASSPORT') ? 3 : 0)
        + (t.match(/<{5,}/g) || []).length;
    const insKeywords = [
        'POLICY', 'INSURANCE', 'PREMIUM', 'INSURED', 'EFFECTIVE', 'COVERAGE',
        'MEMBER', 'BIMA', 'ASSURANCE', 'POUCY', 'POLISY', 'POLCY',
        'HEALTH', 'MEDICLAIM', 'MEDICAL', 'MOTOR', 'AUTO', 'VEHICLE', 'LIFE', 'TERM'
    ];
    const insScore = insKeywords.reduce((s, k) => s + (t.includes(k) ? 2 : 0), 0);
    return insScore > passportScore ? 'INSURANCE' : 'PASSPORT';
}

module.exports = { detectDocType };
