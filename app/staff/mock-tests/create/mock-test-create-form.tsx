
"use client";

import { useCallback, useEffect, useState } from "react";

type SubjectOption = {
  id: string;
  code: string;
  name: string;
  semester: string;
};

type Question = {
  id: string;
  questionText: string;
  marks: number;
  options: { id: string; optionText: string; order: number }[];
};

type Props = { subjects: SubjectOption[] };

export default function MockTestCreateForm({ subjects }: Props) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"RANDOM" | "FIXED">("RANDOM");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [questionCount, setQuestionCount] = useState("10");
  const [negativeMarks, setNegativeMarks] = useState("0");
  const [passingMarks, setPassingMarks] = useState("");
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadQuestions = useCallback(async () => {
    if (!subjectId) {
      setQuestions([]);
      return;
    }

    setLoadingQuestions(true);
    setError("");

    try {
      const params = new URLSearchParams({
        subjectId,
        status: "AVAILABLE",
      });

      const response = await fetch(
        `/api/mock-tests/questions?${params.toString()}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load questions.");
      }

      setQuestions(data.questions ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load questions."
      );
      setQuestions([]);
    } finally {
      setLoadingQuestions(false);
    }
  }, [subjectId]);

  useEffect(() => {
    setSelectedIds([]);
    loadQuestions();
  }, [loadQuestions]);

  function toggleQuestion(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setSelectedIds((current) => {
      const next = [...current];
      const target = index + direction;

      if (target < 0 || target >= next.length) return current;

      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const selectedQuestions = selectedIds
    .map((id) => questions.find((question) => question.id === id))
    .filter((question): question is Question => Boolean(question));

  const fixedTotalMarks = selectedQuestions.reduce(
    (total, question) => total + question.marks,
    0
  );

  const availableMarks = questions.map((question) => question.marks);

  const hasUniformMarks =
    availableMarks.length === 0 ||
    availableMarks.every((marks) => marks === availableMarks[0]);

  const randomTotalMarks =
    questions.length > 0 && hasUniformMarks
      ? Number(questionCount) * (availableMarks[0] ?? 0)
      : 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!subjectId) return setError("Please select a subject.");
    if (!title.trim()) return setError("Please enter a test title.");

    const duration = Number(durationMinutes);
    const negative = Number(negativeMarks);
    const passing = passingMarks.trim() === "" ? null : Number(passingMarks);

    if (!Number.isInteger(duration) || duration <= 0) {
      return setError("Duration must be a positive whole number.");
    }

    if (!Number.isFinite(negative) || negative < 0) {
      return setError("Negative marks must be zero or greater.");
    }

    if (passing !== null && (!Number.isFinite(passing) || passing < 0)) {
      return setError("Passing marks must be zero or greater.");
    }

    if (mode === "RANDOM") {
      const count = Number(questionCount);

      if (!Number.isInteger(count) || count <= 0) {
        return setError("Enter a valid number of questions.");
      }

      if (count > questions.length) {
        return setError(
          `Only ${questions.length} available questions exist for this subject.`
        );
      }

      if (!hasUniformMarks) {
        return setError(
          "Random tests currently require all available questions in this subject to have the same marks."
        );
      }

      if (passing !== null && passing > randomTotalMarks) {
        return setError(`Passing marks cannot exceed ${randomTotalMarks}.`);
      }
    }

    if (mode === "FIXED") {
      if (selectedIds.length === 0) {
        return setError("Select at least one question for the fixed test.");
      }

      if (passing !== null && passing > fixedTotalMarks) {
        return setError(`Passing marks cannot exceed ${fixedTotalMarks}.`);
      }
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/mock-tests/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          subjectId,
          mode,
          durationMinutes: duration,
          questionCount:
            mode === "RANDOM" ? Number(questionCount) : selectedIds.length,
          negativeMarks: negative,
          passingMarks: passing,
          shuffleQuestions,
          shuffleOptions,
          questionIds: mode === "FIXED" ? selectedIds : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to create mock test.");
      }

      setSuccess(
        `Mock test "${data.test?.title ?? title}" was created successfully as a draft.`
      );

      setTitle("");
      setDescription("");
      setPassingMarks("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create mock test."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "form-input w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  const sectionClass =
    "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6 lg:p-7";

  const labelClass = "mb-2 block text-sm font-semibold text-gray-700";

  return (
    <form onSubmit={handleSubmit} className="mock-create-form">
      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span className="text-lg">⚠️</span>
          <div>
            <p className="mb-1 font-semibold">Something needs your attention</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          <span className="text-lg">✓</span>
          <div>
            <p className="mb-1 font-semibold">Test created successfully</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      {/* Test details */}
      <section className={sectionClass}>
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
            📝
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">
              Test details
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Provide the basic information for your mock test.
            </p>
          </div>
          <span className="ml-auto rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            Step 01
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Test title *</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Example: Data Structures - Practice Test 1"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter test instructions or description"
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Subject *</label>
            <select
              className={inputClass}
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              required
            >
              {subjects.length === 0 && (
                <option value="">No subjects available</option>
              )}

              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} - {subject.name} ({subject.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Test mode *</label>
            <select
              className={inputClass}
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "RANDOM" | "FIXED")
              }
            >
              <option value="RANDOM">Random questions</option>
              <option value="FIXED">Fixed questions</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Duration (minutes) *</label>
            <input
              className={inputClass}
              type="number"
              min="1"
              step="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              required
            />
          </div>
        </div>
      </section>

      {/* Question configuration */}
      <section className={sectionClass}>
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl">
            ☑️
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">
              Question configuration
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure the questions that will appear in the test.
            </p>
          </div>
          <span className="ml-auto rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
            Step 02
          </span>
        </div>

        {mode === "RANDOM" ? (
          <div className="space-y-5">
            <div className="max-w-md">
              <label className={labelClass}>Number of questions *</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                max={questions.length || undefined}
                step="1"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-500">
                Questions will be selected randomly from the available question
                bank.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Available questions
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-950">
                  {loadingQuestions ? "…" : questions.length}
                </p>
              </div>

              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">
                  Estimated total marks
                </p>
                <p className="mt-2 text-3xl font-bold text-purple-950">
                  {hasUniformMarks ? randomTotalMarks : "—"}
                </p>
              </div>
            </div>

            {!loadingQuestions &&
              questions.length > 0 &&
              !hasUniformMarks && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  <p className="font-semibold">Different mark values found</p>
                  <p className="mt-1">
                    Questions in this subject have different marks. Random test
                    creation currently requires a consistent mark value.
                  </p>
                </div>
              )}

            {hasUniformMarks && questions.length > 0 && (
              <p className="text-sm text-gray-500">
                Marks per question:{" "}
                <strong className="text-gray-800">
                  {availableMarks[0]}
                </strong>
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  Select test questions
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select questions and arrange their order using the arrows.
                </p>
              </div>

              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                {selectedIds.length} selected
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <p className="text-xs font-medium text-gray-500">Available</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {questions.length}
                </p>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 sm:p-4">
                <p className="text-xs font-medium text-gray-500">Selected</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {selectedIds.length}
                </p>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
                <p className="text-xs font-medium text-blue-700">Total marks</p>
                <p className="mt-1 text-2xl font-bold text-blue-900">
                  {fixedTotalMarks}
                </p>
              </div>
            </div>

            {loadingQuestions ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
                <p className="text-sm font-medium text-gray-600">
                  Loading question bank...
                </p>
              </div>
            ) : questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                <div className="mb-2 text-3xl">📚</div>
                <p className="font-semibold text-gray-800">
                  No available questions
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Upload questions to the question bank first.
                </p>
              </div>
            ) : (
              <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                {questions.map((question) => {
                  const selectedIndex = selectedIds.indexOf(question.id);
                  const selected = selectedIndex !== -1;

                  return (
                    <div
                      key={question.id}
                      className={`rounded-xl border p-4 transition ${
                        selected
                          ? "border-blue-300 bg-blue-50/50 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleQuestion(question.id)}
                          className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-6 text-gray-900">
                            {question.questionText}
                          </p>

                          <p className="mt-2 text-xs font-medium text-gray-500">
                            {question.marks} mark
                            {question.marks === 1 ? "" : "s"}
                          </p>
                        </div>

                        {selected && (
                          <div className="flex shrink-0 items-center gap-1">
                            <span className="mr-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">
                              #{selectedIndex + 1}
                            </span>

                            <button
                              type="button"
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                              onClick={() => moveQuestion(selectedIndex, -1)}
                              disabled={selectedIndex === 0}
                              aria-label="Move question up"
                            >
                              ↑
                            </button>

                            <button
                              type="button"
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                              onClick={() => moveQuestion(selectedIndex, 1)}
                              disabled={selectedIndex === selectedIds.length - 1}
                              aria-label="Move question down"
                            >
                              ↓
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Marks and settings */}
      <section className={sectionClass}>
        <div className="mb-6 flex items-center gap-3 border-b border-gray-100 pb-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-xl">
            ⚙️
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 sm:text-lg">
              Marks and test settings
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Configure scoring and question display preferences.
            </p>
          </div>
          <span className="ml-auto rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Step 03
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>
              Negative marks per wrong answer
            </label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.25"
              value={negativeMarks}
              onChange={(e) => setNegativeMarks(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Marks deducted for each incorrect answer.
            </p>
          </div>

          <div>
            <label className={labelClass}>Passing marks (optional)</label>
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.25"
              value={passingMarks}
              onChange={(e) => setPassingMarks(e.target.value)}
              placeholder="Leave empty for no pass mark"
            />
            <p className="mt-1.5 text-xs text-gray-500">
              Set the minimum score required to pass.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-800">
            Display preferences
          </h3>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={shuffleQuestions}
                onChange={(e) => setShuffleQuestions(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Shuffle question order
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  Display questions in a different order for each attempt.
                </span>
              </span>
            </label>

            <div className="border-t border-gray-200" />

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(e) => setShuffleOptions(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Shuffle option order
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  Randomize the order of answer options.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <a
          href="/staff/mock-tests/questions"
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-400 hover:bg-gray-50"
        >
          ← Back to Question Bank
        </a>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={submitting || subjects.length === 0 || loadingQuestions}
        >
          {submitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Creating test...
            </>
          ) : (
            <>Create Mock Test →</>
          )}
        </button>
      </div>
    </form>
  );
}
