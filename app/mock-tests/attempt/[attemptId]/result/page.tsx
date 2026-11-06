import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ResultDownloadButton from "./result-download-button";

export const dynamic = "force-dynamic";

export default async function MockTestResultPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;

  const attempt = await prisma.mockAttempt.findUnique({
    where: { id: attemptId },
    include: {
      test: {
        select: {
          title: true,
          negativeMarks: true,
          passingMarks: true,
          subject: {
            select: {
              name: true,
              code: true,
            },
          },
        },
      },
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            orderBy: { order: "asc" },
          },
          answer: {
            include: {
              selectedOption: true,
            },
          },
        },
      },
    },
  });

  if (!attempt || attempt.status === "IN_PROGRESS") {
    notFound();
  }

  const correctCount = attempt.questions.filter(
    (question) => question.answer?.isCorrect === true
  ).length;

  const incorrectCount = attempt.questions.filter(
    (question) => question.answer?.isCorrect === false
  ).length;

  const unansweredCount =
    attempt.questions.length - correctCount - incorrectCount;

  const passed =
    attempt.test.passingMarks === null ||
    attempt.obtainedMarks >= attempt.test.passingMarks;

  const percentage =
    attempt.totalMarks > 0
      ? Math.max(
          0,
          Math.min(100, (attempt.obtainedMarks / attempt.totalMarks) * 100)
        )
      : 0;

  return (
    <main className="result-page">
      <div className="result-container">
        <div className="result-breadcrumb">
          <Link href="/mock-tests">Mock Tests</Link>
          <span>/</span>
          <span>Test Result</span>
        </div>

        <header className="result-heading">
          <div>
            <span className="result-eyebrow">EXAMINATION SUMMARY</span>
            <h1>Your Test Result</h1>
            <p>Review your performance and check your answers.</p>
          </div>
          <span className={`result-status ${passed ? "passed" : "failed"}`}>
            {passed ? "✓ Passed" : "Not Passed"}
          </span>
        </header>

        <section className="result-score-card">
          <div className="result-score-main">
            <div className="result-score-label">YOUR FINAL SCORE</div>
            <div className="result-score-value">
              {attempt.obtainedMarks}
              <span> / {attempt.totalMarks}</span>
            </div>
            <div className="result-score-subtitle">
              {percentage.toFixed(1)}% score
            </div>

            <div className="result-score-track">
              <div
                className="result-score-fill"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="result-test-info">
            <span className="result-info-label">TEST</span>
            <h2>{attempt.test.title}</h2>

            <div className="result-info-row">
              <span>Subject</span>
              <strong>{attempt.test.subject.name}</strong>
            </div>
            <div className="result-info-row">
              <span>Subject code</span>
              <strong>{attempt.test.subject.code}</strong>
            </div>
            <div className="result-info-row">
              <span>Attempt status</span>
              <strong>{attempt.status}</strong>
            </div>
            <div className="result-info-row">
              <span>Passing marks</span>
              <strong>
                {attempt.test.passingMarks ?? "Not specified"}
              </strong>
            </div>
          </div>
        </section>

        <section className="result-stat-grid">
          <div className="result-stat">
            <div className="result-stat-icon total">Q</div>
            <div>
              <strong>{attempt.questions.length}</strong>
              <span>Total Questions</span>
            </div>
          </div>

          <div className="result-stat">
            <div className="result-stat-icon correct">✓</div>
            <div>
              <strong>{correctCount}</strong>
              <span>Correct Answers</span>
            </div>
          </div>

          <div className="result-stat">
            <div className="result-stat-icon incorrect">×</div>
            <div>
              <strong>{incorrectCount}</strong>
              <span>Incorrect Answers</span>
            </div>
          </div>

          <div className="result-stat">
            <div className="result-stat-icon unanswered">–</div>
            <div>
              <strong>{unansweredCount}</strong>
              <span>Unanswered</span>
            </div>
          </div>
        </section>

        <section className="result-review-section">
          <div className="result-section-heading">
            <div>
              <span className="result-eyebrow">DETAILED REVIEW</span>
              <h2>Answer Review</h2>
              <p>Compare your answers with the correct answers.</p>
            </div>
            <span className="result-review-count">
              {attempt.questions.length} Questions
            </span>
          </div>

          <div className="result-question-list">
            {attempt.questions.map((question, index) => {
              const selectedId = question.answer?.selectedOptionId;
              const isCorrect = question.answer?.isCorrect === true;
              const isIncorrect = question.answer?.isCorrect === false;

              return (
                <article className="result-question-card" key={question.id}>
                  <div className="result-question-top">
                    <div className="result-question-title">
                      <span className="result-question-index">
                        Q{index + 1}
                      </span>
                      <div>
                        <h3>Question {index + 1}</h3>
                        <span>{question.marks} Marks</span>
                      </div>
                    </div>

                    <span
                      className={`result-answer-status ${
                        isCorrect
                          ? "correct"
                          : isIncorrect
                            ? "incorrect"
                            : "unanswered"
                      }`}
                    >
                      {isCorrect
                        ? "✓ Correct"
                        : isIncorrect
                          ? "× Incorrect"
                          : "Not answered"}
                    </span>
                  </div>

                  <p className="result-question-text">
                    {question.questionText}
                  </p>

                  <div className="result-options">
                    {question.options.map((option, optionIndex) => {
                      const isSelected = selectedId === option.id;
                      const isRightAnswer = option.isCorrect;

                      return (
                        <div
                          key={option.id}
                          className={`result-option ${
                            isRightAnswer
                              ? "right-answer"
                              : isSelected
                                ? "wrong-answer"
                                : ""
                          }`}
                        >
                          <span className="result-option-letter">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>

                          <span className="result-option-text">
                            {option.optionText}
                          </span>

                          <span className="result-option-label">
                            {isRightAnswer
                              ? "Correct answer"
                              : isSelected
                                ? "Your answer"
                                : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="result-question-bottom">
                    <span>
                      Marks awarded:{" "}
                      <strong>
                        {question.answer?.marksAwarded ?? 0} / {question.marks}
                      </strong>
                    </span>
                    {selectedId && (
                      <span>
                        {isCorrect
                          ? "You selected the correct option."
                          : "Your selected option was incorrect."}
                      </span>
                    )}
                  </div>

                  {question.explanation && (
                    <div className="result-explanation">
                      <strong>Explanation</strong>
                      <p>{question.explanation}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <div className="result-actions">
  <Link href="/mock-tests" className="result-back-button">
    ← Back to Mock Tests
  </Link>

  <ResultDownloadButton
    attemptId={attempt.id}
    testTitle={attempt.test.title}
    subjectName={attempt.test.subject.name}
    subjectCode={attempt.test.subject.code}
    participantName={attempt.participantName}
    participantEmail={attempt.participantEmail}
    status={attempt.status}
    obtainedMarks={attempt.obtainedMarks}
    totalMarks={attempt.totalMarks}
    percentage={percentage}
    correctCount={correctCount}
    incorrectCount={incorrectCount}
    unansweredCount={unansweredCount}
    totalQuestions={attempt.questions.length}
    passingMarks={attempt.test.passingMarks}
    negativeMarks={attempt.test.negativeMarks}
    passed={passed}
    startedAt={attempt.startedAt.toISOString()}
    submittedAt={attempt.submittedAt?.toISOString() ?? null}
  />
</div>
      </div>
    </main>
  );
}