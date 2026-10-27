const ISO3 = new Set(('ABW AFG AGO AIA ALA ALB AND ARE ARG ARM ASM ATA ATF ATG AUS AUT AZE BDI BEL BEN BES BFA BGD BGR BHR BHS BIH BLM BLR BLZ BMU BOL BRA BRB BRN BTN BVT BWA CAF CAN CCK CHE CHL CHN CIV CMR COD COG COK COL COM CPV CRI CUB CUW CXR CYM CZE DEU DJI DMA DNK DOM DZA ECU EGY ERI ESH ESP EST ETH FIN FJI FLK FRA FRO FSM GAB GBR GEO GGY GHA GIB GIN GLP GMB GNB GNQ GRC GRD GRL GTM GUF GUM GUY HKG HMD HND HRV HTI HUN IDN IMN IND IOT IRL IRN IRQ ISL ISR ITA JAM JEY JOR JPN KAZ KEN KGZ KHM KIR KNA KOR KWT LAO LBN LBR LBY LCA LIE LKA LSO LTU LUX LVA MAC MAF MAR MCO MDA MDG MDV MEX MHL MKD MLI MLT MMR MNE MNG MNP MOZ MRT MSR MTQ MUS MWI MYS MYT NAM NCL NER NFK NGA NIC NIU NLD NOR NPL NRU NZL OMN PAK PAN PCN PER PHL PLW PNG POL PRI PRK PRT PRY PSE PYF QAT REU ROU RUS RWA SAU SDN SEN SGP SGS SHN SLB SLE SLV SMR SOM SPM SRB SSD STP SUR SVK SVN SWE SWZ SXM SYC SYR TCA TCD TGO THA TJK TKL TKM TLS TON TTO TUN TUR TUV TWN TZA UGA UKR UMI URY UZB VAT VCT VEN VGB VIR VNM VUT WLF WSM YEM ZAF ZMB ZWE').split(/\s+/));

/* digit->letter OCR fix — sirf tab jab code me digits hon */
function fixCountry(code) {
    const c = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!c || !/[0-9]/.test(c)) return '';
    const subs = { '0': ['O', 'D'], '1': ['I', 'L'], '8': ['B'], '5': ['S'], '6': ['G'], '2': ['Z'] };
    const results = new Set();
    const rec = (i, acc) => {
        if (i === c.length) { if (ISO3.has(acc)) results.add(acc); return; }
        rec(i + 1, acc + c[i]);
        if (subs[c[i]]) for (const s of subs[c[i]]) rec(i + 1, acc + s);
    };
    rec(0, '');
    return results.size === 1 ? [...results][0] : '';
}

/* MRZ country: clean alpha-3 ko TRUST karo (fictional EOL/UTO bhi valid),
sirf digits hone par OCR-fix try karo */
function mrzCountry(raw) {
    const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!c || c.length !== 3) return '';
    if (/^[A-Z]{3}$/.test(c)) return c;
    return fixCountry(c) || c;
}
    
const COUNTRY_TO_ISO3 = {
    INDIA: 'IND', BHARAT: 'IND', INDIAN: 'IND', 'UNITED STATES': 'USA', AMERICA: 'USA', AMERICAN: 'USA',
    'UNITED KINGDOM': 'GBR', BRITAIN: 'GBR', BRITISH: 'GBR', ENGLAND: 'GBR',
    CANADA: 'CAN', CANADIAN: 'CAN', AUSTRALIA: 'AUS', AUSTRALIAN: 'AUS', 'NEW ZEALAND': 'NZL',
    PAKISTAN: 'PAK', BANGLADESH: 'BGD', NEPAL: 'NPL', 'SRI LANKA': 'LKA', AFGHANISTAN: 'AFG',
    CHINA: 'CHN', CHINESE: 'CHN', JAPAN: 'JPN', JAPANESE: 'JPN', KOREA: 'KOR',
    FRANCE: 'FRA', FRENCH: 'FRA', GERMANY: 'DEU', GERMAN: 'DEU', ITALY: 'ITA', ITALIAN: 'ITA',
    SPAIN: 'ESP', PORTUGAL: 'PRT', NETHERLANDS: 'NLD', BELGIUM: 'BEL', SWITZERLAND: 'CHE',
    AUSTRIA: 'AUT', SWEDEN: 'SWE', NORWAY: 'NOR', DENMARK: 'DNK', FINLAND: 'FIN', IRELAND: 'IRL',
    POLAND: 'POL', GREECE: 'GRC', ROMANIA: 'ROU', UKRAINE: 'UKR', RUSSIA: 'RUS', RUSSIAN: 'RUS',
    TURKEY: 'TUR', 'SAUDI ARABIA': 'SAU', 'UNITED ARAB EMIRATES': 'ARE', UAE: 'ARE', QATAR: 'QAT',
    KUWAIT: 'KWT', OMAN: 'OMN', ISRAEL: 'ISR', IRAN: 'IRN', IRAQ: 'IRQ', JORDAN: 'JOR', EGYPT: 'EGY',
    MOROCCO: 'MAR', ALGERIA: 'DZA', NIGERIA: 'NGA', GHANA: 'GHA', KENYA: 'KEN', ETHIOPIA: 'ETH',
    'SOUTH AFRICA': 'ZAF', TANZANIA: 'TZA', UGANDA: 'UGA', ZIMBABWE: 'ZWE',
    BRAZIL: 'BRA', ARGENTINA: 'ARG', CHILE: 'CHL', COLOMBIA: 'COL', PERU: 'PER', MEXICO: 'MEX',
    CUBA: 'CUB', HAITI: 'HTI', HAITIAN: 'HTI', HAITIENNE: 'HTI', AYITI: 'HTI', JAMAICA: 'JAM', 'DOMINICAN REPUBLIC': 'DOM',
    MALAYSIA: 'MYS', SINGAPORE: 'SGP', INDONESIA: 'IDN', THAILAND: 'THA', VIETNAM: 'VNM',
    PHILIPPINES: 'PHL', FILIPINO: 'PHL', MYANMAR: 'MMR', CAMBODIA: 'KHM', MONGOLIA: 'MNG'
};

function normCountry(v) {
    if (!v) return '';
    const s = String(v).toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!s) return '';
    if (/^[A-Z]{3}$/.test(s)) return s;                  // MRZ se aya code — as-is
    if (COUNTRY_TO_ISO3[s]) return COUNTRY_TO_ISO3[s];
    for (const [name, code] of Object.entries(COUNTRY_TO_ISO3)) {
        if (name.length >= 4 && s.includes(name)) return code;
    }
    return s.length >= 3 ? s.slice(0, 3) : '';            // e.g. EOLIAN -> EOL
}

module.exports = { ISO3, normCountry, mrzCountry };
