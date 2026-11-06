import { NextResponse } from "next/server";
import { MockTestStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const subjectId = searchParams.get("subjectId") || "";

    const tests = await prisma.mockTest.findMany({
      where: {
        status: MockTestStatus.PUBLISHED,
        ...(subjectId ? { subjectId } : {}),
        ...(search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  subject: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  subject: {
                    code: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
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
        publishedAt: true,
        subject: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: {
              select: {
                number: true,
              },
            },
          },
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: {
        publishedAt: "desc",
      },
    });

    const publishedTests = await prisma.mockTest.findMany({
  where: {
    status: MockTestStatus.PUBLISHED,
  },
  select: {
    subject: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
  },
});

const subjectMap = new Map(
  publishedTests.map((item) => [
    item.subject.id,
    item.subject,
  ])
);

return NextResponse.json({
  tests,
  subjects: Array.from(subjectMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  ),
});

    tests.forEach((test) => {
      subjectMap.set(test.subject.id, {
        id: test.subject.id,
        code: test.subject.code,
        name: test.subject.name,
      });
    });

    return NextResponse.json({
      tests,
      subjects: Array.from(subjectMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    });
  } catch (error) {
    console.error("Public mock tests GET error:", error);

    return NextResponse.json(
      { error: "Unable to load published mock tests." },
      { status: 500 }
    );
  }
}