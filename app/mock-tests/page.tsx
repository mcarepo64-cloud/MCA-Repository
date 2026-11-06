import MockTestPublicList from "./mock-test-public-list";

export const dynamic = "force-dynamic";

export default function PublicMockTestsPage() {
  return (
    <main className="page mock-public-page">
      <div className="mock-public-container">
        <div className="mock-public-hero">
          <span className="mock-public-eyebrow">
            MCA OPEN REPOSITORY
          </span>

          <h1>Mock Tests</h1>

          <p>
            Test your knowledge, practise important MCQs, and track your
            preparation with subject-wise mock tests.
          </p>
        </div>

        <MockTestPublicList />
      </div>
    </main>
  );
}