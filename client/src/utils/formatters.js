export const isPreviewable = url =>
  typeof url === "string" && url.trim().length > 10 && !url.startsWith("__");

export const getFilterLabel = mode =>
  ({ ALL: "All Records", VALID: "Valid Documents", EXPIRING_SOON: "Expiring Soon", EXPIRED: "Expired" }[mode] || "Records");

export const formatDateString = dateStr => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

export const getStatus = (item, baseDate = new Date()) => {
  if (!item.doe) return { cls: "badge-success", text: "Valid" };
  const d = new Date(item.doe);
  if (isNaN(d.getTime())) return { cls: "badge-success", text: "Valid" };

  const startOfToday = new Date(baseDate);
  startOfToday.setHours(0, 0, 0, 0);

  const sixMonthsFromNow = new Date(startOfToday);
  sixMonthsFromNow.setMonth(startOfToday.getMonth() + 6);

  if (d < startOfToday) return { cls: "badge-danger", text: "Expired" };
  if (d <= sixMonthsFromNow) return { cls: "badge-warning", text: "Expiring Soon" };
  return { cls: "badge-success", text: "Valid" };
};
