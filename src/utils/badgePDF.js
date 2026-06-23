import jsPDF from "jspdf";

/**
 * Generates and downloads a badge PDF for a given registration.
 * @param {Object} item - Registration object from the table row
 */
export function downloadBadgePDF(item) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [86, 125], // Credit-card-ish badge size (86mm × 125mm)
  });

  const W = 86;
  const H = 125;

  // ── Background ────────────────────────────────────────────────
  // Purple header band
  doc.setFillColor(63, 14, 96); // #3f0e60
  doc.rect(0, 0, W, 36, "F");

  // White body
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 36, W, H - 36, "F");

  // Orange accent strip at the bottom
  doc.setFillColor(249, 115, 22); // orange-500
  doc.rect(0, H - 8, W, 8, "F");

  // ── Event Title ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text("GULFOOD 2026", W / 2, 14, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(210, 180, 230);
  doc.text("Jan 26, 2026  –  Jan 30, 2026", W / 2, 21, { align: "center" });

  doc.setFontSize(7);
  doc.text("Dubai World Trade Centre", W / 2, 27, { align: "center" });

  // ── Avatar circle placeholder ─────────────────────────────────
  doc.setFillColor(240, 232, 255);
  doc.circle(W / 2, 49, 12, "F");

  // Initials inside the circle
  const initials = [
    item.first_name?.[0] || "",
    item.last_name?.[0] || "",
  ]
    .join("")
    .toUpperCase();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(63, 14, 96);
  doc.text(initials || "?", W / 2, 52, { align: "center" });

  // ── Name ──────────────────────────────────────────────────────
  const fullName =
    `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
    item.full_name ||
    "—";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(30, 10, 50);
  doc.text(fullName, W / 2, 68, { align: "center" });

  // ── Job Title ─────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 80, 130);
  doc.text(item.job_title || "—", W / 2, 75, { align: "center" });

  // ── Divider ───────────────────────────────────────────────────
  doc.setDrawColor(220, 210, 235);
  doc.setLineWidth(0.3);
  doc.line(10, 79, W - 10, 79);

  // ── Detail rows ───────────────────────────────────────────────
  const details = [
    ["Company", item.company_name],
    ["Email", item.email],
    ["Ticket", item.ticket_name],
    ["Status", item.status],
  ];

  let y = 86;
  details.forEach(([label, value]) => {
    // Label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(140, 100, 170);
    doc.text(label.toUpperCase(), 10, y);

    // Value
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 20, 60);
    const displayValue = value || "—";
    // Truncate long values so they don't overflow
    const truncated =
      displayValue.length > 38
        ? displayValue.substring(0, 36) + "…"
        : displayValue;
    doc.text(truncated, 10, y + 4.5);

    y += 11;
  });

  // ── URN ───────────────────────────────────────────────────────
  if (item.urn) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(255, 255, 255);
    doc.text(`URN: ${item.urn}`, W / 2, H - 3, { align: "center" });
  }

  // ── Save ──────────────────────────────────────────────────────
  const safeName = fullName.replace(/\s+/g, "_");
  doc.save(`badge_${safeName}.pdf`);
}