
"use client";

import { useCallback, useEffect, useState } from "react";

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  mode: "RANDOM" | "FIXED";
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  negativeMarks: number;
  passingMarks: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  createdAt: string;
  subject: {
    name: string;
    code: string;
    semester: { number: number };
  };
  _count: {
    attempts: number;
    fixedQuestions: number;
  };
};

export default function MockTestManagement() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ search, status });

      const response = await fetch(
        `/api/mock-tests/manage?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load mock tests.");
      }

      setTests(data.tests ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load mock tests."
      );
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(loadTests, 300);
    return () => clearTimeout(timer);
  }, [loadTests]);

  async function updateTest(testId: string, action: string) {
    const confirmation =
      action === "publish"
        ? "Publish this mock test? Public users will be able to take it."
        : action === "archive"
          ? "Archive this mock test?"
          : "Return this mock test to draft?";

    if (!window.confirm(confirmation)) return;

    setUpdatingId(testId);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/mock-tests/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId, action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update mock test.");
      }

      setMessage(data.message || "Mock test updated successfully.");
      await loadTests();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update mock test."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const counts = {
    total: tests.length,
    published: tests.filter((test) => test.status === "PUBLISHED").length,
    draft: tests.filter((test) => test.status === "DRAFT").length,
    archived: tests.filter((test) => test.status === "ARCHIVED").length,
  };

  return (
    <div className="mock-manage">
      {/* Notifications */}
      {error && (
        <div className="mock-manage-alert error">
          <span className="mock-manage-alert-icon">!</span>
          <p>{error}</p>
        </div>
      )}

      {message && (
        <div className="mock-manage-alert success">
          <span className="mock-manage-alert-icon">✓</span>
          <p>{message}</p>
        </div>
      )}

      {/* Summary cards */}
      <section className="mock-manage-stats">
        <div className="mock-manage-stat">
          <div className="mock-manage-stat-top">
            <span className="mock-manage-stat-icon total">▤</span>
            <span className="mock-manage-stat-label">Displayed tests</span>
          </div>
          <strong>{counts.total}</strong>
          <span className="mock-manage-stat-caption">
            Tests matching your filters
          </span>
        </div>

        <div className="mock-manage-stat">
          <div className="mock-manage-stat-top">
            <span className="mock-manage-stat-icon published">✓</span>
            <span className="mock-manage-stat-label">Published</span>
          </div>
          <strong>{counts.published}</strong>
          <span className="mock-manage-stat-caption">
            Available to students
          </span>
        </div>

        <div className="mock-manage-stat">
          <div className="mock-manage-stat-top">
            <span className="mock-manage-stat-icon draft">✎</span>
            <span className="mock-manage-stat-label">Drafts</span>
          </div>
          <strong>{counts.draft}</strong>
          <span className="mock-manage-stat-caption">
            Not yet published
          </span>
        </div>

        <div className="mock-manage-stat">
          <div className="mock-manage-stat-top">
            <span className="mock-manage-stat-icon archived">▣</span>
            <span className="mock-manage-stat-label">Archived</span>
          </div>
          <strong>{counts.archived}</strong>
          <span className="mock-manage-stat-caption">
            Archived tests
          </span>
        </div>
      </section>

      {/* Search and filters */}
      <section className="mock-manage-filter">
        <div className="mock-manage-filter-heading">
          <div>
            <span className="exam-eyebrow">TEST LIBRARY</span>
            <h2>Manage mock tests</h2>
            <p>Search, review and control the publication of your tests.</p>
          </div>
          <span className="mock-manage-total">
            {counts.total} {counts.total === 1 ? "test" : "tests"}
          </span>
        </div>

        <div className="mock-manage-filter-controls">
          <div className="mock-manage-search">
            <span className="mock-manage-search-icon">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by test title or subject..."
              aria-label="Search mock tests"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="mock-manage-status-filter">
            <label htmlFor="mock-test-status">Filter by status</label>
            <select
              id="mock-test-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </section>

      {/* Test list */}
      <section className="mock-manage-list-section">
        <div className="mock-manage-list-heading">
          <div>
            <h2>Mock tests</h2>
            <p>Review test details and manage their status.</p>
          </div>
        </div>

        {loading ? (
          <div className="mock-manage-loading">
            <div className="exam-spinner" />
            <p>Loading mock tests...</p>
          </div>
        ) : tests.length === 0 ? (
          <div className="mock-manage-empty">
            <div className="mock-manage-empty-icon">📝</div>
            <h3>No mock tests found</h3>
            <p>
              {search || status !== "ALL"
                ? "Try changing your search or status filter."
                : "Create a mock test to see it listed here."}
            </p>
            {(search || status !== "ALL") && (
              <button
                type="button"
                className="exam-button secondary"
                onClick={() => {
                  setSearch("");
                  setStatus("ALL");
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="mock-manage-list">
            {tests.map((test) => (
              <article className="mock-manage-card" key={test.id}>
                {/* Card heading */}
                <div className="mock-manage-card-header">
                  <div className="mock-manage-card-title">
                    <div className="mock-manage-card-icon">📝</div>

                    <div className="mock-manage-card-title-content">
                      <div className="mock-manage-title-row">
                        <h3>{test.title}</h3>

                        <span
                          className={`mock-manage-status ${test.status.toLowerCase()}`}
                        >
                          <span />
                          {test.status}
                        </span>
                      </div>

                      <div className="mock-manage-subject">
                        <strong>{test.subject.code}</strong>
                        <span>{test.subject.name}</span>
                      </div>

                      <span className="mock-manage-semester">
                        Semester {test.subject.semester.number}
                      </span>
                    </div>
                  </div>

                  <div className="mock-manage-actions">
                    {test.status === "DRAFT" && (
                      <button
                        type="button"
                        className="mock-manage-action publish"
                        disabled={updatingId === test.id}
                        onClick={() => updateTest(test.id, "publish")}
                      >
                        {updatingId === test.id
                          ? "Updating..."
                          : "✓ Publish"}
                      </button>
                    )}

                    {test.status === "PUBLISHED" && (
                      <button
                        type="button"
                        className="mock-manage-action draft"
                        disabled={updatingId === test.id}
                        onClick={() => updateTest(test.id, "draft")}
                      >
                        {updatingId === test.id
                          ? "Updating..."
                          : "Return to Draft"}
                      </button>
                    )}

                    {test.status !== "ARCHIVED" && (
                      <button
                        type="button"
                        className="mock-manage-action archive"
                        disabled={updatingId === test.id}
                        onClick={() => updateTest(test.id, "archive")}
                      >
                        Archive
                      </button>
                    )}

                    {test.status === "ARCHIVED" && (
                      <button
                        type="button"
                        className="mock-manage-action restore"
                        disabled={updatingId === test.id}
                        onClick={() => updateTest(test.id, "draft")}
                      >
                        {updatingId === test.id
                          ? "Updating..."
                          : "↻ Restore to Draft"}
                      </button>
                    )}
                  </div>
                </div>

                {test.description && (
                  <p className="mock-manage-description">
                    {test.description}
                  </p>
                )}

                {/* Metadata */}
                <div className="mock-manage-metadata">
                  <div className="mock-manage-meta-item">
                    <span className="mock-manage-meta-icon">◇</span>
                    <div>
                      <span>Test mode</span>
                      <strong>
                        {test.mode === "RANDOM" ? "Random" : "Fixed"}
                      </strong>
                    </div>
                  </div>

                  <div className="mock-manage-meta-item">
                    <span className="mock-manage-meta-icon">☷</span>
                    <div>
                      <span>Questions</span>
                      <strong>{test.questionCount}</strong>
                    </div>
                  </div>

                  <div className="mock-manage-meta-item">
                    <span className="mock-manage-meta-icon">★</span>
                    <div>
                      <span>Total marks</span>
                      <strong>{test.totalMarks}</strong>
                    </div>
                  </div>

                  <div className="mock-manage-meta-item">
                    <span className="mock-manage-meta-icon">◷</span>
                    <div>
                      <span>Duration</span>
                      <strong>{test.durationMinutes} min</strong>
                    </div>
                  </div>

                  <div className="mock-manage-meta-item">
                    <span className="mock-manage-meta-icon">−</span>
                    <div>
                      <span>Negative marks</span>
                      <strong>{test.negativeMarks}</strong>
                    </div>
                  </div>

                  <div className="mock-manage-meta-item">
                    <span className="mock-manage-meta-icon">♙</span>
                    <div>
                      <span>Attempts</span>
                      <strong>{test._count.attempts}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mock-manage-card-footer">
                  <div className="mock-manage-date">
                    <span>Created</span>
                    <strong>
                      {new Date(test.createdAt).toLocaleString()}
                    </strong>
                  </div>

                  {test.publishedAt && (
                    <div className="mock-manage-date">
                      <span>Published</span>
                      <strong>
                        {new Date(test.publishedAt).toLocaleString()}
                      </strong>
                    </div>
                  )}

                  {test.passingMarks !== null && (
                    <div className="mock-manage-date">
                      <span>Passing marks</span>
                      <strong>{test.passingMarks}</strong>
                    </div>
                  )}
                </div>

                {updatingId === test.id && (
                  <div className="mock-manage-updating">
                    Updating test status...
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
