"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionBank from "./question-bank";

type SubjectOption = {
  id: string;
  code: string;
  name: string;
  semester: string;
  program: string;
};

type UploadError = {
  row?: number;
  message?: string;
  error?: string;
};

type UploadResult = {
  message?: string;
  totalRows?: number;
  successCount?: number;
  failedCount?: number;
  errors?: UploadError[];
};

export default function MockQuestionUpload({
  subjects,
  isAdmin,
}: {
  subjects: SubjectOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);

    if (!subjectId) return setError("Please select a subject.");
    if (!file) return setError("Please select a CSV file.");
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return setError("Only CSV files are supported.");
    }

    const formData = new FormData();
    formData.append("subjectId", subjectId);
    formData.append("file", file);

    try {
      setLoading(true);

      const response = await fetch("/api/mock-tests/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || "Question upload failed.");
        return;
      }

      setResult(data);
      setFile(null);

      const fileInput = document.getElementById(
        "mock-question-csv"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";

      if ((data.successCount ?? 0) > 0) {
        setRefreshKey((previous) => previous + 1);
      }

      router.refresh();
    } catch {
      setError("Unable to upload the CSV file. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mock-question-upload">
      <section className="mock-upload-card">
        <div className="mock-upload-header">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                📤
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Upload MCQ Questions
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Import four-option multiple-choice questions using a CSV file.
                </p>
              </div>
            </div>

            <a
              href="/api/mock-tests/template"
              className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              ↓ Download CSV Template
            </a>
          </div>
        </div>

        <div className="mock-upload-body">
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Format</p>
              <p className="mt-1 font-semibold text-gray-900">CSV file</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Question type</p>
              <p className="mt-1 font-semibold text-gray-900">MCQ</p>
            </div>
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Maximum size</p>
              <p className="mt-1 font-semibold text-gray-900">5 MB</p>
            </div>
          </div>

          <form onSubmit={handleUpload} className="space-y-5">
            <div>
              <label className="form-label mb-2 block" htmlFor="mock-subject">
                Subject
              </label>
              <select
                id="mock-subject"
                className="form-input w-full rounded-xl border border-gray-200 px-4 py-3"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setResult(null);
                  setError("");
                  setRefreshKey((previous) => previous + 1);
                }}
                disabled={loading}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} — {subject.name} ({subject.semester})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="form-label mb-2 block"
                htmlFor="mock-question-csv"
              >
                Choose CSV file
              </label>

              <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-5 transition hover:border-blue-300 hover:bg-blue-50/30">
                <input
                  id="mock-question-csv"
                  type="file"
                  accept=".csv,text/csv"
                  className="block w-full cursor-pointer text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                  disabled={loading}
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setResult(null);
                    setError("");
                  }}
                />

                <p className="mt-3 text-xs text-gray-500">
                  Keep the downloaded template headings unchanged. Valid rows
                  are imported even when other rows contain errors.
                </p>

                {file && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-white p-3 text-sm">
                    <span>📄</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-gray-800">
                      {file.name}
                    </span>
                    <span className="shrink-0 text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={loading || !file || !subjectId}
            >
              {loading ? "Uploading questions..." : "Upload Questions"}
            </button>
          </form>
        </div>
      </section>

      {result && (
        <section className="mock-upload-results">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
              ✓
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Upload results</h2>
              <p className="text-sm text-gray-500">
                {result.message || "CSV processing completed."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs font-medium text-gray-500">Total rows</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {result.totalRows ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-medium text-green-700">Imported</p>
              <p className="mt-1 text-3xl font-bold text-green-700">
                {result.successCount ?? 0}
              </p>
            </div>

            <div className="rounded-xl border border-red-100 bg-red-50 p-4">
              <p className="text-xs font-medium text-red-700">Failed rows</p>
              <p className="mt-1 text-3xl font-bold text-red-700">
                {result.failedCount ?? 0}
              </p>
            </div>
          </div>

          {result.errors && result.errors.length > 0 && (
            <div className="mt-6">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-900">
                  Rows requiring correction
                </h3>
                <p className="text-sm text-gray-500">
                  Correct these rows in your CSV before uploading them again.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-gray-50">
                      <tr>
                        <th className="w-24 border-b px-4 py-3 font-semibold text-gray-600">
                          CSV row
                        </th>
                        <th className="border-b px-4 py-3 font-semibold text-gray-600">
                          Error
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="border-b px-4 py-3 font-medium text-gray-700">
                            {item.row ?? "—"}
                          </td>
                          <td className="border-b px-4 py-3 text-gray-600">
                            {item.message || item.error || "Invalid row"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {subjectId && (
        <QuestionBank subjectId={subjectId} refreshKey={refreshKey} />
      )}
    </div>
  );
}