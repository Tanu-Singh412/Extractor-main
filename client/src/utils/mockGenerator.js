export function generateMockPassport(onComplete) {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 800, 500);
  gradient.addColorStop(0, "#0d1527");
  gradient.addColorStop(0.5, "#121e36");
  gradient.addColorStop(1, "#080d1a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 800, 500);

  ctx.strokeStyle = "rgba(28, 25, 34, 0.05)";
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 20) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.bezierCurveTo(i + 50, 150, i - 50, 350, i, 500);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 20) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.bezierCurveTo(200, i + 50, 600, i - 50, 800, i);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px Outfit, Arial, sans-serif";
  ctx.fillText("REPUBLIC OF UTOPIA", 40, 50);
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.font = "14px Inter, Arial, sans-serif";
  ctx.fillText("PASSPORT / PASSEPORT", 40, 75);

  ctx.fillStyle = "#1b2a47";
  ctx.fillRect(40, 110, 150, 200);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 110, 150, 200);
  ctx.fillStyle = "#304770";
  ctx.beginPath();
  ctx.arc(115, 175, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(60, 260);
  ctx.bezierCurveTo(60, 220, 170, 220, 170, 260);
  ctx.closePath();
  ctx.fill();

  const fields = [
    { lbl: "PASSPORT NO.", val: "A12345678", x: 220, y: 125, hl: true },
    { lbl: "SURNAME", val: "DOE", x: 220, y: 175 },
    { lbl: "GIVEN NAMES", val: "JANE ELIZABETH", x: 220, y: 225 },
    { lbl: "NATIONALITY", val: "UTOPIAN", x: 220, y: 275 },
    { lbl: "SEX", val: "F", x: 220, y: 325 },
    { lbl: "DATE OF BIRTH", val: "12 MAR 1990", x: 300, y: 325 },
    { lbl: "DATE OF ISSUE", val: "12 MAR 2020", x: 500, y: 325 },
    { lbl: "DATE OF EXPIRY", val: "12 MAR 2030", x: 220, y: 375 },
  ];
  fields.forEach(f => {
    ctx.fillStyle = "#a0aec0";
    ctx.font = "bold 11px Arial, sans-serif";
    ctx.fillText(f.lbl, f.x, f.y);
    ctx.fillStyle = f.hl ? "#a78bfa" : "#ffffff";
    ctx.font = f.hl ? "bold 18px monospace" : "bold 15px Arial, sans-serif";
    ctx.fillText(f.val, f.x, f.y + 20);
  });

  ctx.fillStyle = "#f5f5f5";
  ctx.fillRect(20, 410, 760, 75);
  ctx.fillStyle = "#1a202c";
  ctx.font = "bold 16px Courier New, Courier, monospace";
  ctx.fillText("P<UTODOE<<JANE<ELIZABETH<<<<<<<<<<<<<<<<<<<<", 40, 440);
  ctx.fillText("A123456784UTO9003129F3003127<<<<<<<<<<<<<<<6", 40, 468);

  const base64Image = canvas.toDataURL("image/png");
  canvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], "mock_passport.png", { type: "image/png" });
    onComplete({ file, preview: base64Image });
  }, "image/png");
}
