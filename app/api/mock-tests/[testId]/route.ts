import { NextResponse } from "next/server";
import { MockTestStatus, QuestionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ testId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { testId } = await context.params;

    const test = await prisma.mockTest.findFirst({
      where: {
        id: testId,
        status: MockTestStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        mode: true,
        durationMinutes: true,
        questionCount: true,
        totalMarks: true,
        passingMarks: true,
        negativeMarks: true,
        subject: {
          select: {
            name: true,
            code: true,
            semester: {
              select: {
                number: true,
              },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Mock test not found or is not published." },
        { status: 404 }
      );
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Public mock test details error:", error);

    return NextResponse.json(
      { error: "Unable to load test details." },
      { status: 500 }
    );
  }
}