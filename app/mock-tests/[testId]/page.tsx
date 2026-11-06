import MockTestInstructions from "./mock-test-instructions";

export const dynamic = "force-dynamic";

export default async function MockTestInstructionsPage({
  params,
}: {
  params: Promise<{ testId: string }>;
}) {
  const { testId } = await params;

  return (
    <main className="page mock-instructions-page">
      <div className="mock-instructions-container">
        <MockTestInstructions testId={testId} />
      </div>
    </main>
  );
}