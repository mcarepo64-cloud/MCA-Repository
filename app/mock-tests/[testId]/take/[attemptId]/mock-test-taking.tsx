"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Option = {
  id: string;
  optionText: string;
  order: number;
};

type Question = {
  id: string;
  questionText: string;
  marks: number;
  order: number;
  options: Option[];
  answer: {
    selectedOptionId: string | null;
  } | null;
};

type Attempt = {
  id: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  totalMarks: number;
  questions: Question[];
};

export default function MockTestTaking({
  attemptId,
}: {
  attemptId: string;
}) {
  const router = useRouter();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const autoSubmitStarted = useRef(false);

  const loadAttempt = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/mock-tests/attempts/${attemptId}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load test.");
      }

      setAttempt(data.attempt);

      const savedAnswers: Record<string, string> = {};

      data.attempt.questions.forEach((question: Question) => {
        if (question.answer?.selectedOptionId) {
          savedAnswers[question.id] = question.answer.selectedOptionId;
        }
      });

      setAnswers(savedAnswers);

      if (data.attempt.expiresAt) {
        const remaining = Math.max(
          0,
          Math.floor(
            (new Date(data.attempt.expiresAt).getTime() - Date.now()) / 1000
          )
        );

        setRemainingSeconds(remaining);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load test."
      );
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  // Keep the countdown aligned with the actual expiry timestamp.
  useEffect(() => {
    if (!attempt?.expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(attempt.expiresAt!).getTime() - Date.now()) / 1000
        )
      );

      setRemainingSeconds(remaining);
    };

    updateTimer();

    const timer = window.setInterval(updateTimer, 1000);

    return () => window.clearInterval(timer);
  }, [attempt?.expiresAt]);

  async function submitTest(isAutomatic = false) {
    if (submitting || autoSubmitStarted.current) return;

    if (!isAutomatic) {
      const confirmed = window.confirm(
        "Are you sure you want to submit this test? You cannot change your answers afterwards."
      );

      if (!confirmed) return;
    }

    autoSubmitStarted.current = true;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(
        `/api/mock-tests/attempts/${attemptId}/submit`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit test.");
      }

      router.push(`/mock-tests/attempt/${attemptId}/result`);
    } catch (err) {
      autoSubmitStarted.current = false;
      setSubmitting(false);
      setError(
        err instanceof Error ? err.message : "Unable to submit test."
      );
    }
  }

  // Automatically submit once when the timer reaches zero.
  useEffect(() => {
    if (
      !attempt ||
      remainingSeconds > 0 ||
      autoSubmitStarted.current ||
      submitting
    ) {
      return;
    }

    submitTest(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, remainingSeconds, submitting]);

  async function saveAnswer(questionId: string, optionId: string) {
    if (saving || submitting) return;

    const previousAnswer = answers[questionId];

    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionId,
    }));

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/mock-tests/attempts/${attemptId}/answers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            attemptQuestionId: questionId,
            selectedOptionId: optionId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save answer.");
      }
    } catch (err) {
      setAnswers((previous) => {
        const updated = { ...previous };

        if (previousAnswer) {
          updated[questionId] = previousAnswer;
        } else {
          delete updated[questionId];
        }

        return updated;
      });

      setError(
        err instanceof Error ? err.message : "Unable to save answer."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="exam-page">
        <div className="exam-loading">
          <div className="exam-spinner" />
          <p>Preparing your examination...</p>
        </div>
      </main>
    );
  }

  if (!attempt) {
    return (
      <main className="exam-page">
        <div className="exam-error">
          <h2>Unable to load test</h2>
          <p>{error || "Please refresh the page and try again."}</p>
        </div>
      </main>
    );
  }

  const question = attempt.questions[currentIndex];

  if (!question) {
    return (
      <main className="exam-page">
        <div className="exam-error">No questions found.</div>
      </main>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = attempt.questions.length;
  const unansweredCount = totalQuestions - answeredCount;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timerWarning = remainingSeconds <= 300;

  return (
    <main className="exam-page">
      <div className="exam-container">
        <header className="exam-header">
          <div>
            <div className="exam-eyebrow">Online Examination</div>
            <h1>Mock Test</h1>
            <p>
              Answer all questions before the time runs out.
            </p>
          </div>

          <div className={`exam-timer ${timerWarning ? "warning" : ""}`}>
            <span className="exam-timer-label">TIME REMAINING</span>
            <strong>
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </strong>
          </div>
        </header>

        <section className="exam-overview">
          <div className="exam-overview-item">
            <span>Total Questions</span>
            <strong>{totalQuestions}</strong>
          </div>
          <div className="exam-overview-item">
            <span>Total Marks</span>
            <strong>{attempt.totalMarks}</strong>
          </div>
          <div className="exam-overview-item">
            <span>Answered</span>
            <strong className="exam-green">{answeredCount}</strong>
          </div>
          <div className="exam-overview-item">
            <span>Unanswered</span>
            <strong className="exam-orange">{unansweredCount}</strong>
          </div>
        </section>

        <div className="exam-progress">
          <div className="exam-progress-heading">
            <span>Test progress</span>
            <strong>
              {Math.round((answeredCount / totalQuestions) * 100)}%
            </strong>
          </div>
          <div className="exam-progress-track">
            <div
              className="exam-progress-fill"
              style={{
                width: `${(answeredCount / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="exam-layout">
          <section className="exam-question-panel">
            <div className="exam-question-heading">
              <div>
                <span className="exam-question-number">
                  QUESTION {currentIndex + 1} OF {totalQuestions}
                </span>
                <h2>Choose the correct answer</h2>
              </div>
              <span className="exam-marks">
                {question.marks} {question.marks === 1 ? "Mark" : "Marks"}
              </span>
            </div>

            <div className="exam-question-text">
              {question.questionText}
            </div>

            <div className="exam-options">
              {question.options.map((option, index) => {
                const selected = answers[question.id] === option.id;

                return (
                  <label
                    key={option.id}
                    className={`exam-option ${selected ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={selected}
                      disabled={saving || submitting}
                      onChange={() => saveAnswer(question.id, option.id)}
                    />
                    <span className="exam-option-letter">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="exam-option-text">
                      {option.optionText}
                    </span>
                    {selected && (
                      <span className="exam-selected-label">Selected</span>
                    )}
                  </label>
                );
              })}
            </div>

            {error && <div className="exam-inline-error">{error}</div>}

            <div className="exam-question-footer">
              <button
                type="button"
                className="exam-button secondary"
                disabled={currentIndex === 0 || submitting}
                onClick={() => setCurrentIndex((previous) => previous - 1)}
              >
                ← Previous
              </button>

              <span className="exam-save-status">
                {saving ? "Saving answer..." : "✓ Answers save automatically"}
              </span>

              <button
                type="button"
                className="exam-button primary"
                disabled={currentIndex === totalQuestions - 1 || submitting}
                onClick={() => setCurrentIndex((previous) => previous + 1)}
              >
                Next →
              </button>
            </div>
          </section>

          <aside className="exam-sidebar">
            <div className="exam-sidebar-card">
              <h3>Question navigator</h3>
              <p>Select a question to move directly to it.</p>

              <div className="exam-question-grid">
                {attempt.questions.map((item, index) => {
                  const isAnswered = Boolean(answers[item.id]);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={submitting}
                      onClick={() => setCurrentIndex(index)}
                      className={`exam-nav-question ${
                        currentIndex === index ? "current" : ""
                      } ${isAnswered ? "answered" : ""}`}
                      aria-label={`Question ${index + 1}${
                        isAnswered ? ", answered" : ", unanswered"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>

              <div className="exam-legend">
                <span><i className="current-dot" /> Current</span>
                <span><i className="answered-dot" /> Answered</span>
                <span><i className="unanswered-dot" /> Unanswered</span>
              </div>
            </div>

            <div className="exam-submit-card">
              <h3>Ready to finish?</h3>
              <p>
                You have answered {answeredCount} out of {totalQuestions}{" "}
                questions.
              </p>
              <button
                type="button"
                className="exam-submit-button"
                disabled={submitting || saving}
                onClick={() => submitTest(false)}
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </button>
              <span>
                {saving
                  ? "Please wait while your answer is saved."
                  : "Review your answers before submitting."}
              </span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}