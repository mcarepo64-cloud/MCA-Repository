
import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/auth";

export const runtime = "nodejs";

const REQUIRED_HEADERS = [
  "question",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctOption",
  "marks",
  "explanation",
];

type CsvRow = Record<string, string>;

type ParsedCsvRow = {
  record: CsvRow;
  info: { lines: number };
};

type ValidQuestion = {
  line: number;
  questionText: string;
  explanation: string | null;
  marks: number;
  options: {
    optionText: string;
    isCorrect: boolean;
    order: number;
  }[];
};

type RowError = {
  row: number;
  question: string;
  error: string;
};

function normalizeQuestion(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate staff
    const staff = await getCurrentStaff();

    if (!staff || staff.isDeleted) {
      return NextResponse.json(
        { message: "Please log in with an active staff account." },
        { status: 401 }
      );
    }

    const formData = await request.formData();

    const subjectId = String(formData.get("subjectId") || "");
    const file = formData.get("file");

    if (!subjectId) {
      return NextResponse.json(
        { message: "Please select a subject." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { message: "Please select a CSV file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { message: "Only CSV files are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: "File must be between 1 byte and 5 MB." },
        { status: 400 }
      );
    }

    // 2. Verify subject and staff assignment
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true, name: true },
    });

    if (!subject) {
      return NextResponse.json(
        { message: "Selected subject was not found." },
        { status: 404 }
      );
    }

    if (staff.role !== "ADMIN") {
      const hasAssignment = staff.assignments.some(
        (assignment) =>
          assignment.subjectId === subjectId &&
          assignment.isActive &&
          assignment.assignedTo === null
      );

      if (!hasAssignment) {
        return NextResponse.json(
          { message: "You are not assigned to this subject." },
          { status: 403 }
        );
      }
    }

    // 3. Read and parse CSV
    const csvText = await file.text();

    let parsedRows: ParsedCsvRow[];

    try {
      parsedRows = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
        info: true,
      }) as ParsedCsvRow[];
    } catch (error) {
      return NextResponse.json(
        {
          message: "Unable to read CSV. Please check its formatting.",
          details:
            error instanceof Error ? error.message : "Invalid CSV format",
        },
        { status: 400 }
      );
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { message: "The CSV file contains no questions." },
        { status: 400 }
      );
    }

    const headers = Object.keys(parsedRows[0].record);

    const missingHeaders = REQUIRED_HEADERS.filter(
      (header) => !headers.includes(header)
    );

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          message: "CSV template columns are missing.",
          missingHeaders,
        },
        { status: 400 }
      );
    }

    // 4. Validate every row
    const validQuestions: ValidQuestion[] = [];
    const errors: RowError[] = [];
    const seenInFile = new Set<string>();

    for (const item of parsedRows) {
      const row = item.record;
      const line = item.info.lines;
      const questionText = (row.question || "").trim();

      const fail = (message: string) => {
        errors.push({
          row: line,
          question: questionText,
          error: message,
        });
      };

      if (!questionText) {
        fail("Question text is required.");
        continue;
      }

      const optionValues = [
        row.optionA,
        row.optionB,
        row.optionC,
        row.optionD,
      ].map((value) => (value || "").trim());

      if (optionValues.some((option) => !option)) {
        fail("All four options are required.");
        continue;
      }

      const correctOption = (row.correctOption || "")
        .trim()
        .toUpperCase();

      if (!["A", "B", "C", "D"].includes(correctOption)) {
        fail("Correct option must be A, B, C or D.");
        continue;
      }

      const marksText = (row.marks || "").trim();
      const marks = Number(marksText);

      if (
        !marksText ||
        !Number.isSafeInteger(marks) ||
        marks <= 0
      ) {
        fail("Marks must be a positive whole number.");
        continue;
      }

      const normalized = normalizeQuestion(questionText);

      if (seenInFile.has(normalized)) {
        fail("Duplicate question found in this CSV.");
        continue;
      }

      seenInFile.add(normalized);

      validQuestions.push({
        line,
        questionText,
        explanation: (row.explanation || "").trim() || null,
        marks,
        options: optionValues.map((optionText, index) => ({
          optionText,
          isCorrect: index === correctOption.charCodeAt(0) - 65,
          order: index,
        })),
      });
    }

    // 5. Detect duplicates already in the question bank
    if (validQuestions.length > 0) {
      const existingQuestions =
        await prisma.questionBankQuestion.findMany({
          where: { subjectId },
          select: { questionText: true },
        });

      const existingSet = new Set(
        existingQuestions.map((question) =>
          normalizeQuestion(question.questionText)
        )
      );

      const uniqueQuestions: ValidQuestion[] = [];

      for (const question of validQuestions) {
        const normalized = normalizeQuestion(question.questionText);

        if (existingSet.has(normalized)) {
          errors.push({
            row: question.line,
            question: question.questionText,
            error: "This question already exists in the subject question bank.",
          });
        } else {
          existingSet.add(normalized);
          uniqueQuestions.push(question);
        }
      }

      validQuestions.length = 0;
      validQuestions.push(...uniqueQuestions);
    }

    // 6. Create upload history
    const batch = await prisma.questionUploadBatch.create({
      data: {
        subjectId,
        uploadedById: staff.id,
        fileName: file.name,
        totalRows: parsedRows.length,
        successCount: 0,
        failedCount: errors.length,
        status: "PROCESSING",
      },
    });

    // 7. Insert valid questions without replacing existing questions
    try {
      await prisma.$transaction(async (tx) => {
        for (const question of validQuestions) {
          await tx.questionBankQuestion.create({
            data: {
              subjectId,
              createdById: staff.id,
              uploadBatchId: batch.id,
              questionText: question.questionText,
              explanation: question.explanation,
              marks: question.marks,
              source: "UPLOAD",
              status: "AVAILABLE",
              options: {
                create: question.options,
              },
            },
          });
        }

        await tx.questionUploadBatch.update({
          where: { id: batch.id },
          data: {
            successCount: validQuestions.length,
            failedCount: errors.length,
            status:
              validQuestions.length > 0 ? "COMPLETED" : "FAILED",
            errorReport:
              errors.length > 0
                ? (errors as unknown as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          },
        });
      });
    } catch (error) {
      await prisma.questionUploadBatch.update({
        where: { id: batch.id },
        data: {
          status: "FAILED",
          successCount: 0,
          failedCount: parsedRows.length,
          errorReport: {
            message:
              error instanceof Error
                ? error.message
                : "Database import failed.",
          },
        },
      });

      throw error;
    }

    return NextResponse.json({
      success: true,
      message:
        validQuestions.length > 0
          ? "Questions imported successfully."
          : "No questions were imported. Please correct the errors.",
      batchId: batch.id,
      totalRows: parsedRows.length,
      successCount: validQuestions.length,
      failedCount: errors.length,
      errors,
    });
  } catch (error) {
    console.error("Mock question upload error:", error);

    return NextResponse.json(
      { message: "Something went wrong while importing questions." },
      { status: 500 }
    );
  }
}
