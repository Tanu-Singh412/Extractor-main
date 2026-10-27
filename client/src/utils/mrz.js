export const calculateMRZCheckDigit = str => {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charAt(i);
    let value = 0;
    if (char >= "0" && char <= "9") value = parseInt(char, 10);
    else if (char >= "A" && char <= "Z") value = char.charCodeAt(0) - 55;
    sum += value * weights[i % 3];
  }
  return sum % 10;
};

export const getMRZLine1 = record => {
  if (!record) return "";
  const country = (record.issuingCountry || "UTO").padEnd(3, "<").substring(0, 3);
  const sName = (record.lastName || record.surname || "").replace(/[^A-Z]/gi, "").toUpperCase();
  const gName = (record.firstName || record.givenNames || "").replace(/[^A-Z\s]/gi, "").replace(/\s+/g, "<").toUpperCase();
  return `P<${country}${`${sName}<<${gName}`.padEnd(39, "<").substring(0, 39)}`.toUpperCase();
};

export const getMRZLine2 = record => {
  if (!record) return "";
  const docNo = (record.passportNo || "").toUpperCase().padEnd(9, "<").substring(0, 9);
  const check1 = calculateMRZCheckDigit(docNo);
  const nationality = (record.nationality || "UTO").toUpperCase().padEnd(3, "<").substring(0, 3);
  const dobRaw = record.dob ? record.dob.replace(/-/g, "") : "19900101";
  const dobYYMMDD = dobRaw.length === 8 ? dobRaw.substring(2) : "900101";
  const check2 = calculateMRZCheckDigit(dobYYMMDD);
  const sexChar = record.sex ? record.sex.substring(0, 1).toUpperCase() : "<";
  const doeRaw = record.doe ? record.doe.replace(/-/g, "") : "20300101";
  const doeYYMMDD = doeRaw.length === 8 ? doeRaw.substring(2) : "300101";
  const check3 = calculateMRZCheckDigit(doeYYMMDD);
  const personalNo = "".padEnd(14, "<");
  const checkPersonal = calculateMRZCheckDigit(personalNo);
  const compositeString = `${docNo}${check1}${dobYYMMDD}${check2}${doeYYMMDD}${check3}${personalNo}${checkPersonal}`;
  const compositeCheck = calculateMRZCheckDigit(compositeString);
  return `${docNo}${check1}${nationality}${dobYYMMDD}${check2}${sexChar}${doeYYMMDD}${check3}${personalNo}${checkPersonal}${compositeCheck}`;
};
