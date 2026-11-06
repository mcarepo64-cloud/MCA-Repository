
"use client";

import { useCallback, useEffect, useState } from "react";

type Option = {
  id?: string;
  optionText: string;
  isCorrect: boolean;
  order?: number;
};

type Question = {
  id: string;
  questionText: string;
  explanation?: string | null;
  marks: number;
  displayOrder: number;
  status: "AVAILABLE" | "ARCHIVED" | "PENDING_REVIEW";
  options: Option[];
};

type Props = {
  subjectId: string;
  refreshKey?: number;
};

export default function QuestionBank({
  subjectId,
  refreshKey = 0,
}: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"AVAILABLE" | "ARCHIVED">(
    "AVAILABLE"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Question | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    if (!subjectId) {
      setQuestions([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        subjectId,
        status,
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const response = await fetch(
        `/api/mock-tests/questions?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load questions.");
      }

      setQuestions(data.questions || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load questions."
      );
    } finally {
      setLoading(false);
    }
  }, [subjectId, search, status]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions, refreshKey]);

  async function updateQuestion() {
    if (!editing) return;

    const correctCount = editing.options.filter(
      (option) => option.isCorrect
    ).length;

    if (!editing.questionText.trim()) {
      setError("Please enter the question.");
      return;
    }

    if (editing.options.length !== 4) {
      setError("A question must have exactly four options.");
      return;
    }

    if (editing.options.some((option) => !option.optionText.trim())) {
      setError("Please fill in all four options.");
      return;
    }

    if (correctCount !== 1) {
      setError("Select exactly one correct option.");
      return;
    }

    if (!Number.isInteger(editing.marks) || editing.marks < 1) {
      setError("Marks must be a positive whole number.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/mock-tests/questions/${editing.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionText: editing.questionText,
            marks: editing.marks,
            explanation: editing.explanation || "",
            options: editing.options.map((option, index) => ({
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              order: index,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update question.");
      }

      setEditing(null);
      setMessage("Question updated successfully.");
      await loadQuestions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update question."
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeArchiveStatus(
    question: Question,
    action: "archive" | "restore"
  ) {
    const confirmed = window.confirm(
      action === "archive"
        ? "Archive this question? It will no longer be available for new tests."
        : "Restore this question to the available question bank?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/mock-tests/questions/${question.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to update question status.");
      }

      setMessage(
        action === "archive"
          ? "Question archived."
          : "Question restored."
      );

      await loadQuestions();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update question."
      );
    }
  }

  async function saveOrder(reordered: Question[]) {
    const previous = questions;
    setQuestions(reordered);

    try {
      const response = await fetch("/api/mock-tests/questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          questionIds: reordered.map((question) => question.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save question order.");
      }

      setMessage("Question order saved.");
    } catch (err) {
      setQuestions(previous);
      setError(
        err instanceof Error ? err.message : "Unable to save question order."
      );
    }
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) return;

    const reordered = [...questions];
    const from = reordered.findIndex((q) => q.id === draggedId);
    const to = reordered.findIndex((q) => q.id === targetId);

    if (from < 0 || to < 0) return;

    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    setDraggedId(null);
    saveOrder(reordered);
  }

  function updateOption(index: number, changes: Partial<Option>) {
    if (!editing) return;

    setEditing({
      ...editing,
      options: editing.options.map((option, optionIndex) => ({
        ...option,
        ...(optionIndex === index ? changes : {}),
      })),
    });
  }

    return (
    <section className="mock-question-bank">
      <div className="mock-question-bank-header">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-2xl">
            📚
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Question Bank</h2>
            <p className="text-sm text-gray-500">
              View, edit, archive and rearrange your subject questions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadQuestions}
          disabled={loading}
          className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          ↻ Refresh
        </button>
      </div>

      <div className="mock-question-filters">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search questions..."
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "AVAILABLE" | "ARCHIVED")
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
          >
            <option value="AVAILABLE">Available Questions</option>
            <option value="ARCHIVED">Archived Questions</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">
            {questions.length} {status.toLowerCase()} question
            {questions.length === 1 ? "" : "s"} displayed
          </p>

          {status === "AVAILABLE" && questions.length > 1 && (
            <p className="text-xs text-gray-500">
              ⠿ Drag questions to change their order
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="text-sm text-gray-500">Loading questions...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <div className="mb-3 text-4xl">📭</div>
          <h3 className="font-semibold text-gray-900">
            No {status.toLowerCase()} questions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Try changing your search or status filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((question, index) => (
            <article
  key={question.id}
  draggable={status === "AVAILABLE"}
  onDragStart={() => setDraggedId(question.id)}
  onDragOver={(e) => {
    if (status === "AVAILABLE") e.preventDefault();
  }}
  onDrop={() => handleDrop(question.id)}
  onDragEnd={() => setDraggedId(null)}
  className={`mock-question-card ${
    draggedId === question.id ? "is-dragging" : ""
  }`}
>
  <div className="mock-question-card-inner">
    {status === "AVAILABLE" && (
      <span
        title="Drag to reorder"
        className="mock-question-drag"
      >
        ⠿
      </span>
    )}

    <div className="mock-question-content">
      <div className="mock-question-meta">
        <div className="mock-question-tags">
          <span className="mock-question-number">
            Question {index + 1}
          </span>

          <span className="mock-question-marks">
            {question.marks} mark(s)
          </span>
        </div>

        <span
          className={`mock-question-status ${
            question.status === "ARCHIVED"
              ? "archived"
              : question.status === "PENDING_REVIEW"
                ? "pending"
                : "available"
          }`}
        >
          {question.status.replace("_", " ")}
        </span>
      </div>

      <p className="mock-question-text">
        {question.questionText}
      </p>

      <div className="mock-question-options">
        {question.options.map((option, optionIndex) => (
          <div
            key={option.id || optionIndex}
            className={`mock-question-option ${
              option.isCorrect ? "correct" : ""
            }`}
          >
            <span className="mock-question-option-letter">
              {String.fromCharCode(65 + optionIndex)}
            </span>

            <span className="mock-question-option-text">
              {option.optionText}

              {option.isCorrect && (
                <span className="mock-correct-label">
                  <span>✓</span> Correct answer
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {question.explanation && (
        <div className="mock-question-explanation">
          <strong>Explanation</strong>
          <span>{question.explanation}</span>
        </div>
      )}

      <div className="mock-question-actions">
        {status === "AVAILABLE" && (
          <button
            type="button"
            onClick={() =>
              setEditing({
                ...question,
                options: question.options.map((option) => ({
                  ...option,
                })),
              })
            }
            className="mock-question-edit-btn"
          >
            ✎ Edit Question
          </button>
        )}

        <button
          type="button"
          onClick={() =>
            changeArchiveStatus(
              question,
              status === "AVAILABLE" ? "archive" : "restore"
            )
          }
          className={
            status === "AVAILABLE"
              ? "mock-question-archive-btn"
              : "mock-question-restore-btn"
          }
        >
          {status === "AVAILABLE" ? "Archive" : "Restore Question"}
        </button>
      </div>
    </div>
  </div>
</article>
          ))}
        </div>
      )}

      {editing && (
  <div className="mock-question-modal">
    <div className="mock-question-modal-content">

      {/* Modal Header */}
      <div className="mock-edit-modal-header">
        <div>
          <h3>Edit Question</h3>
          <p>Update the question, options and correct answer.</p>
        </div>

        <button
          type="button"
          onClick={() => setEditing(null)}
          className="mock-edit-close"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Scrollable Modal Body */}
      <div className="mock-edit-modal-body">
        <div>
          <label className="mock-edit-label">Question</label>
          <textarea
            value={editing.questionText}
            onChange={(e) =>
              setEditing({ ...editing, questionText: e.target.value })
            }
            rows={4}
            className="mock-edit-input"
          />
        </div>

        <div>
          <div className="mock-edit-section-heading">
            <h4>Answer options</h4>
            <p>Select the radio button beside the correct answer.</p>
          </div>

          <div className="mock-edit-options-grid">
            {editing.options.map((option, index) => (
              <div
                key={index}
                className={`mock-edit-option ${
                  option.isCorrect ? "selected" : ""
                }`}
              >
                <label className="mock-edit-label">
                  Option {String.fromCharCode(65 + index)}
                </label>

                <input
                  value={option.optionText}
                  onChange={(e) =>
                    updateOption(index, { optionText: e.target.value })
                  }
                  className="mock-edit-input"
                />

                <label className="mock-edit-radio-label">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={option.isCorrect}
                    onChange={() =>
                      setEditing({
                        ...editing,
                        options: editing.options.map((item, i) => ({
                          ...item,
                          isCorrect: i === index,
                        })),
                      })
                    }
                  />
                  Correct answer
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mock-edit-bottom-fields">
          <div>
            <label className="mock-edit-label">Marks</label>
            <input
              type="number"
              min="1"
              step="1"
              value={editing.marks}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  marks: Number(e.target.value),
                })
              }
              className="mock-edit-input"
            />
          </div>

          <div>
            <label className="mock-edit-label">Explanation</label>
            <input
              value={editing.explanation || ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  explanation: e.target.value,
                })
              }
              className="mock-edit-input"
            />
          </div>
        </div>
      </div>

      {/* Fixed Modal Footer */}
      <div className="mock-edit-modal-footer">
        <button
          type="button"
          onClick={() => setEditing(null)}
          disabled={saving}
          className="mock-edit-cancel-btn"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={updateQuestion}
          disabled={saving}
          className="mock-edit-save-btn"
        >
          {saving ? "Saving changes..." : "Save Changes"}
        </button>
      </div>

    </div>
  </div>
)}
    </section>
  );
}
