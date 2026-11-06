import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/auth";

export const runtime = "nodejs";

type QuestionOptionInput = {
  optionText: string;
  isCorrect: boolean;
};

async function authorizeQuestion(questionId: string) {
  const staff = await getCurrentStaff();

  if (!staff || staff.isDeleted) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please log in again." },
        { status: 401 }
      ),
    };
  }

  const question = await prisma.questionBankQuestion.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      subjectId: true,
      status: true,
    },
  });

  if (!question) {
    return {
      error: NextResponse.json(
        { error: "Question not found." },
        { status: 404 }
      ),
    };
  }

  if (staff.role !== "ADMIN") {
    const hasAssignment = staff.assignments.some(
      (assignment) =>
        assignment.subjectId === question.subjectId &&
        assignment.isActive &&
        !assignment.assignedTo
    );

    if (!hasAssignment) {
      return {
        error: NextResponse.json(
          { error: "You are not assigned to this subject." },
          { status: 403 }
        ),
      };
    }
  }

  return { staff, question };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  try {
    const { questionId } = await params;
    const auth = await authorizeQuestion(questionId);

    if (auth.error) return auth.error;

    const body = await request.json();

    // Archive question
    if (body.action === "archive") {
      await prisma.questionBankQuestion.update({
        where: { id: questionId },
        data: { status: "ARCHIVED" },
      });

      return NextResponse.json({
        message: "Question archived successfully.",
      });
    }

    // Restore an archived question
    if (body.action === "restore") {
      await prisma.questionBankQuestion.update({
        where: { id: questionId },
        data: { status: "AVAILABLE" },
      });

      return NextResponse.json({
        message: "Question restored successfully.",
      });
    }

    // Validate question fields
    const questionText =
      typeof body.questionText === "string"
        ? body.questionText.trim()
        : "";

    const explanation =
      typeof body.explanation === "string"
        ? body.explanation.trim()
        : "";

    const marks = Number(body.marks);

    const options = body.options as QuestionOptionInput[];

    if (!questionText) {
      return NextResponse.json(
        { error: "Question text is required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(marks) || marks <= 0) {
      return NextResponse.json(
        { error: "Marks must be a positive whole number." },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return NextResponse.json(
        { error: "Exactly four options are required." },
        { status: 400 }
      );
    }

    if (
      options.some(
        (option) =>
          typeof option.optionText !== "string" ||
          !option.optionText.trim() ||
          typeof option.isCorrect !== "boolean"
      )
    ) {
      return NextResponse.json(
        { error: "All four options must have valid text." },
        { status: 400 }
      );
    }

    if (options.filter((option) => option.isCorrect).length !== 1) {
      return NextResponse.json(
        { error: "Exactly one option must be marked correct." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.questionBankQuestion.update({
        where: { id: questionId },
        data: {
          questionText,
          explanation: explanation || null,
          marks,
        },
      });

      await tx.questionBankOption.deleteMany({
        where: { questionId },
      });

      await tx.questionBankOption.createMany({
        data: options.map((option, index) => ({
          questionId,
          optionText: option.optionText.trim(),
          isCorrect: option.isCorrect,
          order: index,
        })),
      });
    });

    return NextResponse.json({
      message: "Question updated successfully.",
    });
  } catch (error) {
    console.error("Question update error:", error);

    return NextResponse.json(
      { error: "Unable to update the question." },
      { status: 500 }
    );
  }
}