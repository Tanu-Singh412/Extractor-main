const { mrzCountry, ISO3 } = require('./helpers/countries');

const MRZ_W = [7, 3, 1];
const MRZ_VAL = (() => {
    const v = {};
    for (let i = 0; i < 10; i++) v[String(i)] = i;
    for (let i = 0; i < 26; i++) v[String.fromCharCode(65 + i)] = 10 + i;
    v['<'] = 0;
    return v;
})();

function mrzCheckDigit(str) {
    let sum = 0;
    for (let i = 0; i < str.length; i++) sum += (MRZ_VAL[str[i]] ?? 0) * MRZ_W[i % 3];
    return sum % 10;
}

const digAt = (s, i) => (s[i] >= '0' && s[i] <= '9') ? +s[i] : -1;

/* OCR letter->digit fixes — ONLY inside numeric fields */
function mrzDigits(s) {
    return String(s).replace(/[OQD]/g, '0').replace(/[IL|!]/g, '1').replace(/Z/g, '2')
        .replace(/S/g, '5').replace(/G/g, '6').replace(/B/g, '8').replace(/[^0-9]/g, '');
}

function mrzDate6(raw, kind) {
    const s = mrzDigits(raw);
    if (!/^\d{6}$/.test(s)) return '';
    const yy = +s.slice(0, 2), mm = +s.slice(2, 4), dd = +s.slice(4, 6);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return '';
    const curYY = new Date().getFullYear() % 100;
    const century = kind === 'dob' ? (yy > curYY ? 1900 : 2000) : (yy >= 60 ? 1900 : 2000);
    const out = `${century + yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    return isNaN(new Date(out).getTime()) ? '' : out;
}

function cleanMrzLine(raw) {
    return String(raw).toUpperCase().replace(/[«‹]/g, '<').replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '');
}



/* Check-digit sliding score — OCR char shift handle karta hai */
function td3Score(w) {
    if (w.length !== 44) return -1;
    let s = 0;
    const c9 = digAt(w, 9);
    if (c9 >= 0 && mrzCheckDigit(w.slice(0, 9)) === c9) s += 4;

    const dobRaw = w.slice(13, 19);
    const dobDigits = mrzDigits(dobRaw);
    const isDobNumeric = /^\d{6}$/.test(dobRaw);
    const c19 = digAt(w, 19);
    if (isDobNumeric) {
        s += 2;
        if (c19 >= 0 && mrzCheckDigit(dobRaw) === c19) s += 3;
    } else if (/^\d{6}$/.test(dobDigits) && c19 >= 0 && mrzCheckDigit(dobDigits) === c19) {
        s += 1;
    }

    const expRaw = w.slice(21, 27);
    const expDigits = mrzDigits(expRaw);
    const isExpNumeric = /^\d{6}$/.test(expRaw);
    const c27 = digAt(w, 27);
    if (isExpNumeric) {
        s += 2;
        if (c27 >= 0 && mrzCheckDigit(expRaw) === c27) s += 3;
    } else if (/^\d{6}$/.test(expDigits) && c27 >= 0 && mrzCheckDigit(expDigits) === c27) {
        s += 1;
    }

    const c43 = digAt(w, 43);
    if (c43 >= 0 && mrzCheckDigit(w.slice(0, 10) + w.slice(13, 20) + w.slice(21, 43)) === c43) s += 5;
    if ('MF<'.includes(w[20])) s += 1;
    if (/^[A-Z]{3}$/.test(w.slice(10, 13))) s += 1;
    return s;
}

/* Passport number: field + check digit; OCR letter->digit variants try karo */
function extractPassportNo(w) {
    const field = w.slice(0, 9);
    const base = field.replace(/</g, '');
    const chk = digAt(w, 9);
    if (chk >= 0 && mrzCheckDigit(field) === chk) return base;
    if (chk >= 0) {
        const subs = { O: ['0'], Q: ['0', ''], D: ['0'], I: ['1'], L: ['1', ''], S: ['5'], B: ['8'], Z: ['2'], G: ['6'] };
        const variants = new Set();
        const rec = (i, acc) => {
            if (i === field.length) { if (acc) variants.add(acc); return; }
            if (field[i] !== '<') rec(i + 1, acc + field[i]);
            if (subs[field[i]]) for (const s of subs[field[i]]) rec(i + 1, acc + s);
        };
        rec(0, '');
        for (const v of variants) if (mrzCheckDigit(v.padEnd(9, '<')) === chk) return v;
    }
    return base;
}

/* Line-1 parse — strict anchors: 'P<', '<CCC', ya country code se start */
function parseLine1(raw, expectCountry) {
    let l = String(raw).toUpperCase().replace(/[«‹\[\]]/g, '<').replace(/\s+/g, '').replace(/[^A-Z0-9<]/g, '');
    if (!l) return null;

    // Normalise OCR chevron misreads: K<, <K, KK, <C, C<
    l = l.replace(/(?:K<|<K|KK|K{2,}|<C|C<)/g, '<<');

    // Strip leading noise if P< appears slightly shifted
    const pShift = l.indexOf('P<');
    if (pShift > 0 && pShift <= 6) {
        l = l.slice(pShift);
    }

    if (!l.includes('<<')) {
        l = l.replace(/(.)\1{2,}/g, (m, c) => 'CLKSEIVXZ10'.includes(c) ? '<'.repeat(m.length) : m);
    }

    let country = '', name = '';
    if (l.startsWith('P<') || l.startsWith('PS') || l.startsWith('PC') || l.startsWith('PZ')) {
        country = l.slice(2, 5); name = l.slice(5);
    }
    else if (l.startsWith('P') && expectCountry && l.slice(1, 4) === expectCountry) {
        country = expectCountry; name = l.slice(4);
    }
    else if (/^<[A-Z]{3}/.test(l)) {
        country = l.slice(1, 4); name = l.slice(4);
    }
    else {
        const p = l.indexOf('P<');
        if (p >= 0 && p <= 6) { country = l.slice(p + 2, p + 5); name = l.slice(p + 5); }
        else return null;
    }

    country = country.replace(/</g, '');
    if (!ISO3.has(country) && expectCountry && ISO3.has(expectCountry)) {
        country = expectCountry;
    }
    const toks = name.split(/<+/).filter(Boolean);
    const sur = toks[0] || '';
    if (sur.length < 2) return null;
    const giv = toks.slice(1).join(' ').replace(/[^A-Z\s]/g, '').trim(); 
    return { country, surname: sur, givenNames: giv };
}

function extractMRZ(text) {
    if (!text) return null;
    const cleaned = String(text).split(/\r?\n/).map(cleanMrzLine);
    const entries = [];
    cleaned.forEach((l, src) => {
        if (l.length < 20) return;
        if (!l.includes('<') && !/^[A-Z0-9]{40,}$/.test(l)) return;
        const pIdx = [];
        let p = l.indexOf('P<');
        while (p !== -1) { pIdx.push(p); p = l.indexOf('P<', p + 1); }
        if (pIdx.length >= 2 && l.length >= pIdx[1] + 40) {
            entries.push({ line: l.slice(pIdx[0], pIdx[1]), src });
            entries.push({ line: l.slice(pIdx[1], pIdx[1] + 44), src });
        } else if (pIdx.length === 1 && l.length >= pIdx[0] + 80) {
            entries.push({ line: l.slice(pIdx[0], pIdx[0] + 44), src });
            entries.push({ line: l.slice(pIdx[0] + 44, pIdx[0] + 88), src });
        } else {
            entries.push({ line: l, src });
        }
    });
    if (!entries.length) return null;

    let best = null;
    entries.forEach((e, ei) => {
        if ((e.line.match(/\d/g) || []).length < 3) return;
        const pad = e.line + '<'.repeat(44);
        for (let off = 0; off + 44 <= pad.length; off++) {
            const s = td3Score(pad.slice(off, off + 44));
            if (s >= 4 && (!best || s > best.score)) best = { score: s, w: pad.slice(off, off + 44), ei };
        }
    });
    if (!best) return null;

    const w = best.w;
    const pn = extractPassportNo(w);
    const nationality = mrzCountry(w.slice(10, 13));
    const dob = /^\d{6}$/.test(mrzDigits(w.slice(13, 19))) ? mrzDate6(w.slice(13, 19), 'dob') : '';
    const expiry = /^\d{6}$/.test(mrzDigits(w.slice(21, 27))) ? mrzDate6(w.slice(21, 27), 'expiry') : '';
    const sex = w[20] === 'M' ? 'M' : w[20] === 'F' ? 'F' : '';

    // Search for line 1 both before and immediately after best.ei
    let surname = '', givenNames = '', issuing = '';
    let rawNameLine = '';
    const candIndices = [];
    for (let j = best.ei - 1; j >= 0; j--) candIndices.push(j);
    for (let j = best.ei + 1; j < Math.min(entries.length, best.ei + 3); j++) candIndices.push(j);

    for (const j of candIndices) {
        const candLine = entries[j].line;
        const normCand = candLine.replace(/(?:K<|<K|KK|<C|C<)/g, '<<');
        const pPos = normCand.indexOf('P<');
        const hasPAnchor = (pPos >= 0 && pPos <= 6) || normCand.startsWith('P') || normCand.includes('<<');
        if (!hasPAnchor) continue;
        const info = parseLine1(candLine, nationality);
        if (info) {
            surname = info.surname;
            givenNames = info.givenNames;
            issuing = info.country;
            rawNameLine = candLine;
            break;
        }
    }

    const cleanIssuing = mrzCountry(issuing);
    const finalIssuing = (ISO3.has(cleanIssuing) ? cleanIssuing : '') || nationality || '';
    return {
        // Expose the raw name line so higher‑level code can clean it
        nameLine: rawNameLine,
        mrzLine2: best.w,
        passportNo: pn, surname, givenNames,
        issuingCountry: finalIssuing,
        nationality: nationality || finalIssuing,
        dob, expiry, sex, valid: best.score >= 10, score: best.score
    };
}

module.exports = { extractMRZ };
