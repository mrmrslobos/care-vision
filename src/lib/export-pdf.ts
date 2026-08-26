import { jsPDF } from "jspdf";
import type { CareVisit } from "@/types/care";
import { CARE_CHECKLIST } from "@/lib/care-checklist";
import type { TrendSummary } from "@/lib/trends";

export function downloadCareReportPdf(
  visits: CareVisit[],
  trends: TrendSummary,
  patientLabel = "Loved one"
): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;
  const line = (text: string, size = 11, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, 520);
    lines.forEach((l: string) => {
      if (y > 720) {
        doc.addPage();
        y = margin;
      }
      doc.text(l, margin, y);
      y += size + 4;
    });
  };

  line("Care Visit Log — Conference Summary", 16, true);
  line(`Prepared for care discussions about ${patientLabel}`, 10);
  line(`Generated ${new Date().toLocaleString()}`, 10);
  y += 8;

  line("Overview", 13, true);
  line(
    `${trends.visitCount} visits logged · ${trends.avgChecklistPct}% average checklist completion`
  );
  line(
    `Concerns: ${trends.concernCounts.none} clear · ${trends.concernCounts.watch} watch · ${trends.concernCounts.urgent} discuss soon`
  );
  y += 8;

  line("Recent visits", 13, true);
  visits.slice(0, 8).forEach((v) => {
    const date = new Date(v.visitedAt).toLocaleString();
    const checked = v.checklist.filter((c) => c.checked).length;
    line(
      `${date} — ${v.visitorName} · checklist ${checked}/${CARE_CHECKLIST.length} · ${v.overallConcern}`,
      10,
      true
    );
    const checkedItems = v.checklist
      .filter((c) => c.checked)
      .map((c) => CARE_CHECKLIST.find((i) => i.id === c.itemId)?.label)
      .filter(Boolean);
    if (checkedItems.length) line(`Checked: ${checkedItems.join("; ")}`, 9);
    v.notes.slice(0, 2).forEach((n) => line(`Note: ${n.body}`, 9));
    v.photos
      .filter((p) => p.analysis?.summary)
      .slice(0, 2)
      .forEach((p) => line(`Photo: ${p.analysis!.summary}`, 9));
    y += 4;
  });

  line("Not medical advice. Family observation log for advocacy.", 8);

  doc.save(`care-visit-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
