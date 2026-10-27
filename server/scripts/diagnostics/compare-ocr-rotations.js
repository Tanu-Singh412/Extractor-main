const path = require('path');
const { UPLOAD_DIR } = require('../../src/config/paths');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

(async () => {
  const filePath = path.join(UPLOAD_DIR, '1788588207561-kkkkkkkkkkkkkkkkk.webp');
  const fileBuffer = fs.readFileSync(filePath);
  const baseSharp = sharp(fileBuffer).resize({ width: 1500, withoutEnlargement: true });

  const buf0 = await baseSharp.clone().png().toBuffer();
  const buf90 = await baseSharp.clone().rotate(90).png().toBuffer();
  const buf180 = await baseSharp.clone().rotate(180).png().toBuffer();
  const buf270 = await baseSharp.clone().rotate(270).png().toBuffer();
  const bufEnh = await baseSharp.clone().rotate().grayscale().normalize().png().toBuffer();

  const [res0, res90, res180, res270, resEnh] = await Promise.all([
    Tesseract.recognize(buf0, 'eng'),
    Tesseract.recognize(buf90, 'eng'),
    Tesseract.recognize(buf180, 'eng'),
    Tesseract.recognize(buf270, 'eng'),
    Tesseract.recognize(bufEnh, 'eng')
  ]);

  const texts = [
    {text: res0.data.text, name: '0deg'},
    {text: res90.data.text, name: '90deg'},
    {text: res180.data.text, name: '180deg'},
    {text: res270.data.text, name: '270deg'},
    {text: resEnh.data.text, name: 'enh'}
  ];

  const scoreText = (t) => {
    if (!t || t.trim().length < 10) return -1000;
    let score = 0;
    if (/P<[A-Z]{3}/i.test(t)) score += 100;
    if (/[0-9A-Z<]{9}[0-9<][A-Z<]{3}[0-9A-Z<]{6}/i.test(t)) score += 80;
    if (/<{5,}/.test(t)) score += 30;
    const dateMatches = t.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g);
    if (dateMatches) score += dateMatches.length * 15;
    const passportMatches = t.match(/(?:SURNAME|GIVEN|PASSPORT|REPUBLIC|INDIA|BIRTH|DATE|SEX|NATIONALITY|EXPIRY|ISSUE|AUTHORITY|SIGNATURE)/gi);
    if (passportMatches) score += passportMatches.length * 5;
    const insuranceMatches = t.match(/(?:INSURANCE|CERTIFICATE|POLICY|BUSINESS|INSURED|EFFECTIVE|EXAGIO|COVERAGE|BENEFIT|PERIOD|MEMBER|PREMIUM|VEHICLE|ASSISTANCE|HEALTH|CAR|MOTOR|GROUP)/gi);
    if (insuranceMatches) score += insuranceMatches.length * 5;
    const noise = (t.match(/[\{\}\[\]\~\`\_]/g) || []).length;
    score -= noise * 2;
    score += Math.min(50, t.length / 100);
    return score;
  };

  let best = texts[0];
  let maxScore = scoreText(best.text);
  for (let i = 1; i < texts.length; i++) {
    const curScore = scoreText(texts[i].text);
    if (curScore > maxScore) {
      maxScore = curScore; best = texts[i];
    }
  }

  console.log('Best variant:', best.name, 'score', maxScore);
  console.log('--- Raw OCR of best variant ---');
  console.log(best.text);
})();
