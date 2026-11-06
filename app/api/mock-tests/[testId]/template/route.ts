import { NextResponse } from "next/server";

export async function GET() {
  const csv = [
    "question,optionA,optionB,optionC,optionD,correctOption,marks,explanation",
    '"What is HTML?","Programming language","Markup language","Database","Operating system","B",1,"HTML is a markup language."',
    '"Which language is used with React?","Python","Java","JavaScript","PHP","C",1,"React commonly uses JavaScript."',
  ].join("\r\n");

  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="mock-test-questions-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}