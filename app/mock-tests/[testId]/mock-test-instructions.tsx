"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TestDetails = {
  id: string;
  title: string;
  description: string | null;
  mode: "RANDOM" | "FIXED";
  durationMinutes: number;
  questionCount: number;
  totalMarks: number;
  passingMarks: number | null;
  negativeMarks: number;
  subject: {
    name: string;
    code: string;
    semester: {
      number: number;
    };
  };
};

export default function MockTestInstructions({
  testId,
}: {
  testId: string;
}) {
  const router = useRouter();

  const [test, setTest] = useState<TestDetails | null>(null);
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTest() {
      try {
        const response = await fetch(`/api/mock-tests/${testId}`, {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to load test.");
        }

        setTest(data.test);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load test."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTest();
  }, [testId]);

  async function startTest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!participantName.trim()) {
      setError("Please enter your name.");
      return;
    }

    setStarting(true);

    try {
      const response = await fetch(`/api/mock-tests/${testId}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantName: participantName.trim(),
          participantEmail: participantEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to start test.");
      }

      router.push(`/mock-tests/${testId}/take/${data.attempt.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start test."
      );
    } finally {
      setStarting(false);
    }
  }

  const instructions = [
    "Check the test duration before starting.",
    "Each question has four options and only one correct answer.",
    "Wrong answers will receive the configured negative marks.",
    "The test will be automatically submitted when the timer expires.",
    "Make sure you submit before leaving the test.",
    "Once started, the attempt timer cannot be reset by refreshing the page.",
  ];

  if (loading) {
    return (
      <div className="mock-instructions-state">
        <div className="mock-instructions-spinner" />
        <p>Loading test information...</p>
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="mock-instructions-state">
        <div className="mock-instructions-state-icon">!</div>
        <h2>Unable to load test</h2>
        <p>{error}</p>
        <Link href="/mock-tests" className="mock-instructions-back">
          ← Back to Mock Tests
        </Link>
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="mock-instructions-layout">
      {/* Breadcrumb */}
      <div className="mock-instructions-breadcrumb">
        <Link href="/mock-tests">Mock Tests</Link>
        <span>/</span>
        <span>{test.title}</span>
      </div>

      {/* Test header */}
      <section className="mock-instructions-hero">
        <div className="mock-instructions-hero-content">
          <div className="mock-instructions-tags">
            <span className="mock-instructions-code">
              {test.subject.code}
            </span>

            <span className="mock-instructions-semester">
              Semester {test.subject.semester.number}
            </span>

            <span
              className={`mock-instructions-mode ${
                test.mode === "RANDOM" ? "random" : "fixed"
              }`}
            >
              {test.mode === "RANDOM" ? "Random test" : "Fixed test"}
            </span>
          </div>

          <h1>{test.title}</h1>

          <p className="mock-instructions-subject">
            {test.subject.name}
          </p>

          {test.description && (
            <p className="mock-instructions-description">
              {test.description}
            </p>
          )}
        </div>

        <div className="mock-instructions-hero-icon">📝</div>
      </section>

      {/* Test information */}
      <section className="mock-instructions-section">
        <div className="mock-instructions-section-heading">
          <div>
            <h2>Test information</h2>
            <p>Review the test details before you begin.</p>
          </div>
        </div>

        <div className="mock-instructions-info-grid">
          <div className="mock-instructions-info-card">
            <div className="mock-instructions-info-icon">◷</div>
            <div>
              <span>Duration</span>
              <strong>{test.durationMinutes} minutes</strong>
            </div>
          </div>

          <div className="mock-instructions-info-card">
            <div className="mock-instructions-info-icon">☷</div>
            <div>
              <span>Questions</span>
              <strong>{test.questionCount}</strong>
            </div>
          </div>

          <div className="mock-instructions-info-card">
            <div className="mock-instructions-info-icon">★</div>
            <div>
              <span>Total marks</span>
              <strong>{test.totalMarks}</strong>
            </div>
          </div>

          <div className="mock-instructions-info-card">
            <div className="mock-instructions-info-icon">−</div>
            <div>
              <span>Negative marks</span>
              <strong>{test.negativeMarks} per wrong answer</strong>
            </div>
          </div>

          <div className="mock-instructions-info-card">
            <div className="mock-instructions-info-icon">✓</div>
            <div>
              <span>Passing marks</span>
              <strong>
                {test.passingMarks ?? "Not specified"}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Instructions and registration */}
      <div className="mock-instructions-bottom-grid">
        <section className="mock-instructions-panel">
          <div className="mock-instructions-panel-heading">
            <div className="mock-instructions-panel-icon">ℹ</div>
            <div>
              <h2>Instructions</h2>
              <p>Please read carefully before starting.</p>
            </div>
          </div>

          <ol className="mock-instructions-list">
            {instructions.map((instruction, index) => (
              <li key={index}>
                <span>{index + 1}</span>
                <p>{instruction}</p>
              </li>
            ))}
          </ol>

          <div className="mock-instructions-warning">
            <span>⚠</span>
            <p>
              Your test timer starts immediately after you begin. Make sure
              you are ready before selecting Start Test.
            </p>
          </div>
        </section>

        {/* Participant form */}
        <form
          onSubmit={startTest}
          className="mock-instructions-form"
        >
          <div className="mock-instructions-form-heading">
            <div className="mock-instructions-form-icon">👤</div>
            <div>
              <h2>Your details</h2>
              <p>Enter your details to begin the test.</p>
            </div>
          </div>

          {error && (
            <div className="mock-instructions-form-error">
              {error}
            </div>
          )}

          <div className="mock-instructions-field">
            <label htmlFor="participantName">
              Your name <span>*</span>
            </label>

            <input
              id="participantName"
              type="text"
              value={participantName}
              onChange={(event) =>
                setParticipantName(event.target.value)
              }
              placeholder="Enter your full name"
              maxLength={100}
              required
            />
          </div>

          <div className="mock-instructions-field">
            <label htmlFor="participantEmail">
              Email address
              <span className="optional-label">Optional</span>
            </label>

            <input
              id="participantEmail"
              type="email"
              value={participantEmail}
              onChange={(event) =>
                setParticipantEmail(event.target.value)
              }
              placeholder="Enter your email address"
              maxLength={254}
            />
          </div>

          <div className="mock-instructions-form-note">
            Your details will be associated with this test attempt.
          </div>

          <button
            type="submit"
            className="mock-instructions-start-btn"
            disabled={starting}
          >
            {starting ? "Starting test..." : "Start Test"}
            {!starting && <span>→</span>}
          </button>

          <Link
            href="/mock-tests"
            className="mock-instructions-cancel"
          >
            ← Cancel and go back
          </Link>
        </form>
      </div>
    </div>
  );
}