const parser = require('../../src/parsers');

const text = `RZECZPOSPOLITA POLSKA / REPUBLIC OF POLAND / REPUBLIOUE DE FOLOGHE
a ae Tol FStoo0177
pur SS
a. REWIATRA
ANNA
E 30 MARIMAR 1872 72033012847
aed aos
RE KF sicrecin
¥ =% ¥  WUPLUCZ08 an
a 13 LIPAIUL 2016 crm eT
P<POLKOWALSKACCANNACCLCLLLLLLLLLLLLLLLLLLLLL
Z800001774POL7203305F 1607 130<<<<<<<<<<K<<<0B
] y`;

(async () => {
    try {
        const result = await parser.parsePassportText(text);
        console.log(JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
