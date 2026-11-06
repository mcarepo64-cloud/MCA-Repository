import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStaff } from "@/lib/auth";
import { QuestionStatus } from "@prisma/client";

export const runtime = "nodejs";

async function authorizeSubject(subjectId: string) {
  const staff = await getCurrentStaff();

  if (!staff || staff.isDeleted) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized. Please log in again." },
        { status: 401 }
      ),
    };
  }

  if (staff.role !== "ADMIN") {
    const hasAssignment = staff.assignments.some(
      (assignment) =>
        assignment.subjectId === subjectId &&
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

  return { staff };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status") || "AVAILABLE";

    const status: QuestionStatus | "ALL" =
      statusParam === "ARCHIVED"
        ? QuestionStatus.ARCHIVED
        : statusParam === "ALL"
          ? "ALL"
          : QuestionStatus.AVAILABLE;
    if (!subjectId) {
      return NextResponse.json(
        { error: "Subject ID is required." },
        { status: 400 }
      );
    }

    if (!["AVAILABLE", "ARCHIVED", "ALL"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid question status." },
        { status: 400 }
      );
    }

    const auth = await authorizeSubject(subjectId);
    if (auth.error) return auth.error;

    const questions = await prisma.questionBankQuestion.findMany({
      where: {
        subjectId,
        ...(status === "ALL" ? {} : { status }),
        ...(search
          ? {
              questionText: {
                contains: search,
                mode: "insensitive",
              },
            }
          : {}),
      },
      include: {
        options: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            optionText: true,
            isCorrect: true,
            order: true,
          },
        },
      },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({
      questions,
      total: questions.length,
    });
  } catch (error) {
    console.error("Question bank API error:", error);

    return NextResponse.json(
      { error: "Unable to load questions." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const subjectId = String(body.subjectId || "");
    const questionIds = body.questionIds;

    if (!subjectId || !Array.isArray(questionIds)) {
      return NextResponse.json(
        { error: "Subject ID and question order are required." },
        { status: 400 }
      );
    }

    if (
      questionIds.some(
        (id: unknown) => typeof id !== "string" || !id.trim()
      ) ||
      new Set(questionIds).size !== questionIds.length
    ) {
      return NextResponse.json(
        { error: "Invalid or duplicate question IDs." },
        { status: 400 }
      );
    }

    const auth = await authorizeSubject(subjectId);
    if (auth.error) return auth.error;

    const questions = await prisma.questionBankQuestion.findMany({
      where: {
        subjectId,
        status: "AVAILABLE",
        id: { in: questionIds },
      },
      select: { id: true },
    });

    if (questions.length !== questionIds.length) {
      return NextResponse.json(
        { error: "Some questions are invalid or unavailable." },
        { status: 400 }
      );
    }

    await prisma.$transaction(
      questionIds.map((id: string, index: number) =>
        prisma.questionBankQuestion.update({
          where: { id },
          data: { displayOrder: index + 1 },
        })
      )
    );

    return NextResponse.json({
      message: "Question order saved successfully.",
    });
  } catch (error) {
    console.error("Question reorder error:", error);

    return NextResponse.json(
      { error: "Unable to save question order." },
      { status: 500 }
    );
  }
}