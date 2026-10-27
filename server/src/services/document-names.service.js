function applyProperNameHandling(data, finalType) {
    if (finalType === 'PASSPORT' && data.mrz?.nameLine) {
        try {
            // Extract the name segment before MRZ field separator "<<"
            const nameSection = data.mrz.nameLine.split('<<')[0];
            const cleaned = nameSection
                .replace(/^P<?[A-Z]{3}/, '')
                .replace(/<+/g, ' ')
                .trim();
            const tokens = cleaned.split(/\s+/).filter(Boolean);
            let surname = '';
            let givenNames = '';
            if (tokens.length >= 2) {
                // Normal case: first token is surname, rest are given names
                surname = tokens[0];
                givenNames = tokens.slice(1).join(' ');
            } else if (tokens.length === 1) {
                // Heuristic: split on double 'SS' which may separate concatenated surname and given name
                const parts = tokens[0].split(/SS/);
                if (parts.length === 2) {
                    surname = parts[0];
                    givenNames = parts[1];
                } else {
                    surname = tokens[0];
                }
            }
            // Populate fields
            data.surname = surname;
            data.givenNames = givenNames;
            // Also set firstName/lastName for convenience
            data.firstName = givenNames;
            data.lastName = surname;
            console.log('[DEBUG] Proper name extraction applied for passport:', { surname, givenNames });
        } catch (e) {
            console.warn('[WARN] Proper name handling failed for passport:', e.message);
        }
    } else if (finalType === 'INSURANCE' && data.memberName) {
        try {
            const tokens = data.memberName.split(/\s+/).filter(Boolean);
            let firstName = '';
            let lastName = '';
            if (tokens.length >= 2) {
                firstName = tokens[0];
                lastName = tokens.slice(1).join(' ');
            } else {
                firstName = tokens[0] || '';
            }
            // Populate fields
            data.firstName = firstName;
            data.lastName = lastName;
            // Also map to givenNames/surname for consistency
            data.givenNames = firstName;
            data.surname = lastName;
            console.log('[DEBUG] Proper name extraction applied for insurance:', { firstName, lastName });
        } catch (e) {
            console.warn('[WARN] Proper name handling failed for insurance:', e.message);
        }
    }
}

module.exports = { applyProperNameHandling };
