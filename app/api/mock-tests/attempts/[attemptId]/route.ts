
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function GET(
  _request: Request,
  context: RouteContext
) {
  try {
    const { attemptId } = await context.params;

    const attempt = await prisma.mockAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        startedAt: true,
        expiresAt: true,
        totalMarks: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            questionText: true,
            marks: true,
            order: true,
            options: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                optionText: true,
                order: true,
              },
            },
            answer: {
              select: {
                selectedOptionId: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Attempt not found." },
        { status: 404 }
      );
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "This attempt is no longer active." },
        { status: 409 }
      );
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Load attempt error:", error);

    return NextResponse.json(
      { error: "Unable to load test questions." },
      { status: 500 }
    );
  }
}
