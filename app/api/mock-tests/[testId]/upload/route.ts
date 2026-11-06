import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/auth";

export const runtime = "nodejs";

type CsvRow = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  marks: string;
  explanation?: string;
};

type UploadError = {
  row: number;
  message: string;
};

const requiredHeaders = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "marks",
  "explanation",
];

function normalizeQuestion(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(request: NextRequest) {
  let batchId: string | null = null;

  try {
    // 1. Authenticate staff
    const staff = await getCurrentStaff();

    if (!staff || staff.isDeleted) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    // 2. Read uploaded file
    const formData = await request.formData();
    const subjectId = String(formData.get("subjectId") || "");
    const file = formData.get("file");

    if (!subjectId) {
      return NextResponse.json(
        { error: "Please select a subject." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a CSV file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "CSV must not be empty or larger than 5 MB." },
        { status: 400 }
      );
    }

    // 3. Check subject
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Subject not found." },
        { status: 404 }
      );
    }

    // 4. Check permission
    const isAdmin = staff.role === "ADMIN";

    if (!isAdmin) {
      const hasAssignment = staff.assignments.some(
        (assignment) =>
          assignment.subjectId === subjectId &&
          assignment.isActive &&
          !assignment.assignedTo
      );

      if (!hasAssignment) {
        return NextResponse.json(
          { error: "You are not assigned to this subject." },
          { status: 403 }
        );
      }
    }

    // 5. Parse CSV
    const csvText = await file.text();

    let parsedRows: CsvRow[];

    try {
      parsedRows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
        relax_column_count: false,
      }) as CsvRow[];
    } catch {
      return NextResponse.json(
        { error: "Invalid CSV format. Please use the provided template." },
        { status: 400 }
      );
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { error: "The CSV file contains no questions." },
        { status: 400 }
      );
    }

    // 6. Validate headers
    const headers = Object.keys(parsedRows[0] || {});

    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Missing CSV columns: ${missingHeaders.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 7. Validate each row
    const errors: UploadError[] = [];
    const validRows: Array<{
      question: string;
      options: string[];
      correctIndex: number;
      marks: number;
      explanation: string | null;
      displayOrder: number;
    }> = [];

    const seenQuestions = new Set<string>();

    const existingQuestions = await prisma.questionBankQuestion.findMany({
      where: { subjectId },
      select: { questionText: true },
    });

    const existingQuestionSet = new Set(
      existingQuestions.map((item) =>
        normalizeQuestion(item.questionText)
      )
    );

    const maxOrder = await prisma.questionBankQuestion.aggregate({
      where: { subjectId },
      _max: { displayOrder: true },
    });

    let nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    parsedRows.forEach((row, index) => {
      const csvRow = index + 2;

      const question = String(row.question || "").trim();

      const options = [
        String(row.optionA || "").trim(),
        String(row.optionB || "").trim(),
        String(row.optionC || "").trim(),
        String(row.optionD || "").trim(),
      ];

      const correctOption = String(row.correctOption || "")
        .trim()
        .toUpperCase();

      const marks = Number(row.marks);

      const explanation = String(row.explanation || "").trim();

      if (!question) {
        errors.push({
          row: csvRow,
          message: "Question is required.",
        });
        return;
      }

      if (options.some((option) => !option)) {
        errors.push({
          row: csvRow,
          message: "All four options are required.",
        });
        return;
      }

      if (!["A", "B", "C", "D"].includes(correctOption)) {
        errors.push({
          row: csvRow,
          message: "Correct option must be A, B, C, or D.",
        });
        return;
      }

      if (!Number.isInteger(marks) || marks <= 0) {
        errors.push({
          row: csvRow,
          message: "Marks must be a positive whole number.",
        });
        return;
      }

      const normalized = normalizeQuestion(question);

      if (seenQuestions.has(normalized)) {
        errors.push({
          row: csvRow,
          message: "Duplicate question found in this CSV file.",
        });
        return;
      }

      if (existingQuestionSet.has(normalized)) {
        errors.push({
          row: csvRow,
          message: "This question already exists in the subject question bank.",
        });
        return;
      }

      seenQuestions.add(normalized);

      validRows.push({
        question,
        options,
        correctIndex: ["A", "B", "C", "D"].indexOf(correctOption),
        marks,
        explanation: explanation || null,
        displayOrder: nextOrder++,
      });
    });

    // 8. Create upload batch
    const batch = await prisma.questionUploadBatch.create({
      data: {
        subjectId,
        uploadedById: staff.id,
        fileName: file.name,
        totalRows: parsedRows.length,
        status: "PROCESSING",
      },
    });

    batchId = batch.id;

    // 9. Import valid questions
    await prisma.$transaction(async (tx) => {
      for (const item of validRows) {
        await tx.questionBankQuestion.create({
          data: {
            subjectId,
            createdById: staff.id,
            uploadBatchId: batch.id,
            questionText: item.question,
            explanation: item.explanation,
            marks: item.marks,
            displayOrder: item.displayOrder,
            source: "UPLOAD",
            status: "AVAILABLE",
            options: {
              create: item.options.map((optionText, index) => ({
                optionText,
                isCorrect: index === item.correctIndex,
                order: index,
              })),
            },
          },
        });
      }

      await tx.questionUploadBatch.update({
        where: { id: batch.id },
        data: {
          successCount: validRows.length,
          failedCount: errors.length,
          status: validRows.length > 0 ? "COMPLETED" : "FAILED",
          errorReport:
            errors.length > 0
              ? (errors as unknown as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });
    });

    return NextResponse.json({
      message:
        validRows.length > 0
          ? "Question upload processed successfully."
          : "No valid questions were imported.",
      batchId: batch.id,
      totalRows: parsedRows.length,
      successCount: validRows.length,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Mock question upload error:", error);

    if (batchId) {
      await prisma.questionUploadBatch
        .update({
          where: { id: batchId },
          data: {
            status: "FAILED",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json(
      { error: "Something went wrong while uploading questions." },
      { status: 500 }
    );
  }
}