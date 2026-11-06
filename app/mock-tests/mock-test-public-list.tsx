"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Subject = {
  id: string;
  code: string;
  name: string;
};

type MockTest = {
  id: string;
  title: string;
  description: string | null;
  mode: "RANDOM" | "FIXED";
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passingMarks: number | null;
  negativeMarks: number;
  publishedAt: string | null;
  subject: {
    id: string;
    code: string;
    name: string;
    semester: {
      number: number;
    };
  };
  _count: {
    attempts: number;
  };
};

export default function MockTestPublicList() {
  const [tests, setTests] = useState<MockTest[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (subjectId) params.set("subjectId", subjectId);

      const response = await fetch(
        `/api/mock-tests/public?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load mock tests.");
      }

      setTests(data.tests ?? []);
      setSubjects(data.subjects ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load mock tests."
      );
    } finally {
      setLoading(false);
    }
  }, [search, subjectId]);

  useEffect(() => {
    const timer = setTimeout(loadTests, 300);
    return () => clearTimeout(timer);
  }, [loadTests]);

  return (
    <div className="mock-public-content">
      {/* Summary */}
      <div className="mock-public-stats">
        <div className="mock-public-stat">
          <div className="mock-public-stat-icon">📝</div>
          <div>
            <p>Matching tests</p>
            <h3>{loading ? "—" : tests.length}</h3>
          </div>
        </div>

        <div className="mock-public-stat">
          <div className="mock-public-stat-icon">📚</div>
          <div>
            <p>Available subjects</p>
            <h3>{loading ? "—" : subjects.length}</h3>
          </div>
        </div>

        <div className="mock-public-stat">
          <div className="mock-public-stat-icon">🎯</div>
          <div>
            <p>Practice mode</p>
            <h3>Self-paced</h3>
          </div>
        </div>
      </div>

      {/* Search and filters */}
      <section className="mock-public-filter-section">
        <div className="mock-public-filter-heading">
          <div>
            <h2>Explore mock tests</h2>
            <p>Find a test by title or select a subject.</p>
          </div>
        </div>

        <div className="mock-public-toolbar">
          <div className="mock-public-search">
            <span>⌕</span>
            <input
              type="search"
              placeholder="Search mock tests or subjects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
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

          <select
            className="mock-public-subject-select"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="mock-public-error">
          <p>{error}</p>
          <button type="button" onClick={loadTests}>
            Try again
          </button>
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="mock-public-loading">
          <div className="mock-public-spinner" />
          <p>Loading available mock tests...</p>
        </div>
      ) : tests.length === 0 ? (
        /* Empty state */
        <div className="mock-public-empty">
          <div className="mock-public-empty-icon">📋</div>
          <h2>No mock tests found</h2>
          <p>
            No Matching tests match your search. Try another keyword or
            choose a different subject.
          </p>

          {(search || subjectId) && (
            <button
              type="button"
              className="mock-public-reset"
              onClick={() => {
                setSearch("");
                setSubjectId("");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="mock-public-results-heading">
            <div>
              <h2>Available tests</h2>
              <p>
                {tests.length} test{tests.length === 1 ? "" : "s"} found
              </p>
            </div>
          </div>

          <div className="mock-public-grid">
            {tests.map((test) => (
              <article className="mock-public-card" key={test.id}>
                <div className="mock-public-card-top">
                  <div className="mock-public-card-tags">
                    <span className="mock-public-subject-tag">
                      {test.subject.code}
                    </span>
                    <span className="mock-public-semester-tag">
                      Semester {test.subject.semester.number}
                    </span>
                  </div>

                  <span
                    className={`mock-public-mode ${
                      test.mode === "RANDOM" ? "random" : "fixed"
                    }`}
                  >
                    {test.mode === "RANDOM" ? "Random" : "Fixed"}
                  </span>
                </div>

                <div className="mock-public-card-info">
                  <h3>{test.title}</h3>
                  <p className="mock-public-subject-name">
                    {test.subject.name}
                  </p>

                  {test.description && (
                    <p className="mock-public-description">
                      {test.description}
                    </p>
                  )}
                </div>

                <div className="mock-public-metrics">
                  <div>
                    <span className="mock-public-metric-icon">☷</span>
                    <div>
                      <small>Questions</small>
                      <strong>{test.questionCount}</strong>
                    </div>
                  </div>

                  <div>
                    <span className="mock-public-metric-icon">★</span>
                    <div>
                      <small>Total marks</small>
                      <strong>{test.totalMarks}</strong>
                    </div>
                  </div>

                  <div>
                    <span className="mock-public-metric-icon">◷</span>
                    <div>
                      <small>Duration</small>
                      <strong>{test.durationMinutes} min</strong>
                    </div>
                  </div>

                  <div>
                    <span className="mock-public-metric-icon">−</span>
                    <div>
                      <small>Negative marks</small>
                      <strong>{test.negativeMarks}</strong>
                    </div>
                  </div>
                </div>

                {test.passingMarks !== null && (
                  <p className="mock-public-passing">
                    Passing marks: <strong>{test.passingMarks}</strong>
                  </p>
                )}

                <div className="mock-public-card-footer">
                  <span>
                    {test._count.attempts} attempt
                    {test._count.attempts === 1 ? "" : "s"}
                  </span>

                  <Link
                    href={`/mock-tests/${test.id}`}
                    className="mock-public-start-btn"
                  >
                    Start Test <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}