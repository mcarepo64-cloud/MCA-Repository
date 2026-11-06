
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import MockTestTaking from "./mock-test-taking";

export const dynamic = "force-dynamic";

export default async function TakeMockTestPage({
  params,
}: {
  params: Promise<{
    testId: string;
    attemptId: string;
  }>;
}) {
  const { testId, attemptId } = await params;

  const attempt = await prisma.mockAttempt.findFirst({
    where: {
      id: attemptId,
      testId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!attempt || attempt.status !== "IN_PROGRESS") {
    notFound();
  }

  return <MockTestTaking attemptId={attemptId} />;
}
