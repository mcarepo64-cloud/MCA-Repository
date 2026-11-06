"use client";

import { useState } from "react";

type ResultDownloadProps = {
  attemptId: string;
  testTitle: string;
  subjectName: string;
  subjectCode: string;
  participantName: string | null;
  participantEmail: string | null;
  status: string;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  totalQuestions: number;
  passingMarks: number | null;
  negativeMarks: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string | null;
};

export default function ResultDownloadButton({
  attemptId,
  testTitle,
  subjectName,
  subjectCode,
  participantName,
  participantEmail,
  status,
  obtainedMarks,
  totalMarks,
  percentage,
  correctCount,
  incorrectCount,
  unansweredCount,
  totalQuestions,
  passingMarks,
  negativeMarks,
  passed,
  startedAt,
  submittedAt,
}: ResultDownloadProps) {
  const [downloading, setDownloading] = useState(false);

  async function downloadPDF() {
    try {
      setDownloading(true);

      const { jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;

      const formatDate = (value: string | null) => {
        if (!value) return "Not available";

        return new Date(value).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      };

      const addFooter = () => {
        pdf.setDrawColor(225, 232, 242);
        pdf.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(120, 130, 145);
        pdf.text(
          "MCA Open Repository | Mock Test Result",
          margin,
          pageHeight - 11
        );
        pdf.text(
          `Page ${pdf.getCurrentPageInfo().pageNumber}`,
          pageWidth - margin,
          pageHeight - 11,
          { align: "right" }
        );
      };

      const addSectionTitle = (title: string, y: number) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(35, 55, 85);
        pdf.text(title, margin, y);
      };

      const addInfoRow = (
        label: string,
        value: string,
        y: number
      ) => {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(110, 120, 135);
        pdf.text(label, margin + 5, y);

        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(35, 45, 65);

        const lines = pdf.splitTextToSize(value || "—", 85);
        pdf.text(lines, pageWidth - margin - 5, y, {
          align: "right",
        });
      };

      // Header
      pdf.setFillColor(37, 99, 235);
      pdf.rect(0, 0, pageWidth, 39, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(19);
      pdf.text("MCA Open Repository", margin, 17);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text("MOCK TEST PERFORMANCE REPORT", margin, 26);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("TEST RESULT", pageWidth - margin, 17, {
        align: "right",
      });

      // Test information
      pdf.setTextColor(35, 45, 65);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);

      const titleLines = pdf.splitTextToSize(testTitle, contentWidth);
      pdf.text(titleLines, margin, 52);

      let y = 52 + titleLines.length * 7 + 4;

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(100, 110, 125);
      pdf.text(`${subjectName} (${subjectCode})`, margin, y);

      y += 12;

      // Score card
      pdf.setFillColor(239, 246, 255);
      pdf.roundedRect(margin, y, contentWidth, 43, 4, 4, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(37, 99, 235);
      pdf.text("YOUR FINAL SCORE", margin + 8, y + 10);

      pdf.setFontSize(25);
      pdf.setTextColor(25, 45, 80);
      pdf.text(
        `${obtainedMarks} / ${totalMarks}`,
        margin + 8,
        y + 24
      );

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(37, 99, 235);
      pdf.text(`${percentage.toFixed(1)}%`, pageWidth - margin - 8, y + 17, {
        align: "right",
      });

      pdf.setFontSize(9);
      pdf.setTextColor(passed ? 22 : 190, passed ? 135 : 55, passed ? 75 : 55);
      pdf.text(
        passed ? "PASSED" : "NOT PASSED",
        pageWidth - margin - 8,
        y + 27,
        { align: "right" }
      );

      // Progress bar
      const barX = margin + 8;
      const barY = y + 33;
      const barWidth = contentWidth - 16;

      pdf.setFillColor(210, 224, 245);
      pdf.roundedRect(barX, barY, barWidth, 3, 1.5, 1.5, "F");

      pdf.setFillColor(37, 99, 235);
      pdf.roundedRect(
        barX,
        barY,
        Math.max(0, (barWidth * percentage) / 100),
        3,
        1.5,
        1.5,
        "F"
      );

      y += 55;

      // Performance statistics
      addSectionTitle("PERFORMANCE SUMMARY", y);
      y += 7;

      const stats = [
        { label: "Total Questions", value: totalQuestions, color: [37, 99, 235] },
        { label: "Correct Answers", value: correctCount, color: [22, 163, 74] },
        { label: "Incorrect Answers", value: incorrectCount, color: [220, 38, 38] },
        { label: "Unanswered", value: unansweredCount, color: [107, 114, 128] },
      ];

      const gap = 4;
      const statWidth = (contentWidth - gap * 3) / 4;
      const statHeight = 23;

      stats.forEach((stat, index) => {
        const x = margin + index * (statWidth + gap);

        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, y, statWidth, statHeight, 2, 2, "F");

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(15);
        pdf.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
        pdf.text(String(stat.value), x + statWidth / 2, y + 10, {
          align: "center",
        });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(90, 100, 115);
        pdf.text(stat.label, x + statWidth / 2, y + 17, {
          align: "center",
        });
      });

      y += 34;

      // Student information
      addSectionTitle("STUDENT & TEST INFORMATION", y);
      y += 8;

      pdf.setDrawColor(225, 232, 242);
      pdf.roundedRect(margin, y - 4, contentWidth, 76, 2, 2);

      const rows = [
        ["Student name", participantName || "Not provided"],
        ["Email address", participantEmail || "Not provided"],
        // ["Attempt ID", attemptId],
        ["Attempt status", status],
        ["Started at", formatDate(startedAt)],
        ["Submitted at", formatDate(submittedAt)],
        ["Passing marks", passingMarks === null ? "Not specified" : String(passingMarks)],
        ["Negative marking", String(negativeMarks)],
      ];

      rows.forEach(([label, value], index) => {
        const rowY = y + index * 8.5;

        if (index > 0) {
          pdf.setDrawColor(238, 241, 246);
          pdf.line(margin + 4, rowY - 4, pageWidth - margin - 4, rowY - 4);
        }

        addInfoRow(label, value, rowY);
      });

      y += rows.length * 8.5 + 5;

      // Score note
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(margin, y, contentWidth, 19, 2, 2, "F");

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(90, 100, 115);
      pdf.text(
        "This report summarizes the student's performance in the selected mock test.",
        margin + 5,
        y + 8
      );
      pdf.text(
        "The score shown is based on the submitted attempt.",
        margin + 5,
        y + 13
      );

      addFooter();

      const safeTitle = testTitle
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 45);

      pdf.save(`${safeTitle || "Mock-Test"}-Result.pdf`);
    } catch (error) {
      console.error("PDF download failed:", error);
      window.alert("Unable to generate the PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={downloadPDF}
      disabled={downloading}
      className="result-download-btn"
    >
      {downloading ? "Generating PDF..." : "↓ Download Result PDF"}
    </button>
  );
}