const MONTHS = { 
    JAN: '01', IAN: '01', JAH: '01',
    FEB: '02',
    MAR: '03',
    APR: '04',
    MAY: '05',
    JUN: '06',
    JUL: '07',
    AUG: '08',
    SEP: '09',
    OCT: '10', '0CT': '10',
    NOV: '11', N0V: '11',
    DEC: '12', GEC: '12', DEG: '12', DEO: '12'
};
const DATE_RE = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.][A-Z\d]{2,5})|(\d{1,2}\s+[A-Z]{3,9}(?:\s*\/\s*[A-Z]{3,9})?\s+\d{2,4})|(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})|([A-Z]{3,9}\s+\d{1,2},?\s+\d{2,4})|(\d{1,2}[\/\-.]\d{4})|(\b\d{1,2}\s+[A-Z]{2,}\s+\d{4}\b)/gi;

function monthOf(w) { return MONTHS[String(w).slice(0, 3).toUpperCase()] || ''; }

function iso(y, m, d) {
    y = String(y); m = String(m).padStart(2, '0'); d = String(d).padStart(2, '0');
    if (+m < 1 || +m > 12 || +d < 1 || +d > 31) return '';
    return isNaN(new Date(`${y}-${m}-${d}T00:00:00Z`).getTime()) ? '' : `${y}-${m}-${d}`;
}

/* Convert almost any date format -> YYYY-MM-DD ("" if invalid) */
function toISO(s) {
    if (!s) return '';
    s = String(s).trim().toUpperCase().replace(/[.'`]/g, ' ').replace(/\s+/g, ' ').trim();
    // Fix bilingual months e.g. "NOV / NOV" -> "NOV"
    s = s.replace(/([A-Z]{3,9})\s*\/\s*[A-Z]{3,9}/g, '$1');
    let m;
    if ((m = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/))) return iso(m[1], m[2], m[3]);
    if ((m = s.match(/^(\d{1,2})\s*([A-Z]{3,9})\s*,?\s*(\d{2,4})$/))) { 
        const mo = monthOf(m[2]); 
        if (!mo) return '';
        let y = m[3]; if (y.length === 2) y = +y > 40 ? '19' + y : '20' + y;
        return iso(y, mo, m[1]); 
    }
    if ((m = s.match(/^([A-Z]{3,9})\s+(\d{1,2}),?\s+(\d{2,4})$/))) { 
        const mo = monthOf(m[1]); 
        if (!mo) return '';
        let y = m[3]; if (y.length === 2) y = +y > 40 ? '19' + y : '20' + y;
        return iso(y, mo, m[2]); 
    }
    if ((m = s.match(/^(\d{1,2})[\/\-. ]([A-Z]{3,9})[\/\-. ]?(\d{2,4})$/))) {
        const mo = monthOf(m[2]); if (!mo) return '';
        let y = m[3]; if (y.length === 2) y = +y > 40 ? '19' + y : '20' + y;
        return iso(y, mo, m[1]);
    }
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.]([A-Z\d]{2,5})$/))) {
        let d = +m[1], mo = +m[2], y = m[3];
        y = y.replace(/[^0-9]/g, '');
        if (y.length === 5) y = y.slice(-4); // e.g., 72024 -> 2024
        if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; }  // month-first input
        if (y.length === 2) y = +y > 40 ? '19' + y : '20' + y;
        if (y.length === 4 && (+y > 2100 || +y < 1900)) return '';
        return iso(y, String(mo), String(d));
    }
    // Fallback for corrupted OCR where day is lost (e.g. "1.2013" -> "2013-01-01")
    if ((m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/))) {
        return iso(m[2], m[1], '01');
    }
    return '';
}

function firstDateIn(line) {
    DATE_RE.lastIndex = 0;
    const m = DATE_RE.exec(String(line).toUpperCase());
    return m ? toISO(m[0]) : '';
}

module.exports = { DATE_RE, toISO, firstDateIn };
