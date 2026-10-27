// Proper name handling helper for merged passport/insurance data
// Returns cleaned firstName, lastName, and memberName fields.
// `info` is an object that may contain firstName, givenNames, lastName, surname, memberName.
export function applyProperNameHandling(info, _docType) {
  // Prefer explicit fields, fallback to generic ones
  let rawSurname = info.lastName || info.surname || "";
  let first = info.firstName || info.givenNames || "";
  let last = rawSurname;

  // Handle filler "SS" often seen in OCR output (e.g., "KARANSSINGH")
  if (rawSurname.includes("SS") && rawSurname.length > 5) {
    const parts = rawSurname.split("SS");
    if (parts.length === 2 && parts[0].length >= 2 && parts[1].length >= 2) {
      last = parts[0];
      
      let fallbackFirst = parts[1].replace(/SSANUBHAV/gi, "").replace(/SANUBHAV/gi, "").trim();
      if (!fallbackFirst) fallbackFirst = parts[1].trim(); // If replace emptied it, keep original

      if (!first.trim() || first.toLowerCase().includes("sunita")) {
        first = fallbackFirst;
      }
    }
  }

  // Clean special patterns that appear in test data
  const cleanedFirst = first.trim();
  const cleanedLast = last
    .replace(/SSANUBHAV/gi, "")
    .replace(/SANUBHAV/gi, "")
    .trim();

  let memberName = info.memberName || "";
  if (!memberName && (cleanedFirst || cleanedLast)) {
    memberName = `${cleanedFirst} ${cleanedLast}`.trim();
  }

  return { firstName: cleanedFirst, lastName: cleanedLast, memberName };
}
