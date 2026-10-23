"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AssignmentRow = {
  id: string;
  staffId: string;
  staffName: string;
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  programName: string;
  subjectLabel: string;
  academicYear: string;
  isActive: boolean;
  assignedFrom: string;
  assignedTo: string | null;
};

export default function AssignmentHistory({
  assignments,
  staff,
  subjects,
}: {
  assignments: AssignmentRow[];
  staff: { id: string; name: string }[];
  subjects: { id: string; label: string }[];
}) {
  const router = useRouter();

  const [editing, setEditing] = useState<AssignmentRow | null>(null);
  const [staffId, setStaffId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function openEdit(row: AssignmentRow) {
    setEditing(row);
    setStaffId(row.staffId);
    setSubjectId(row.subjectId);
    setAcademicYear(row.academicYear);
    setError("");
    setMessage("");
  }

  async function saveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!editing || busy) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: editing.id,
          staffId,
          subjectId,
          academicYear,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not reassign subject.");
        return;
      }

      setMessage(
        "Assignment updated. Previous assignment history and published content have been preserved."
      );

      setEditing(null);
      router.refresh();
    } catch (error) {
      console.error("Reassignment failed:", error);
      setError("Could not update the assignment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && (
        <div className="success" role="status">{message}</div>
      )}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Staff</th>
              <th>Subject</th>
              <th>Academic year</th>
              <th>Status</th>
              <th>From</th>
              <th>To</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {assignments.map((a) => (
              <tr key={a.id}>
                <td>{a.staffName}</td>

                <td>
                  {a.programName} - {a.subjectCode} - {a.subjectName}
                </td>

                <td>{a.academicYear}</td>

                <td>
                  <span
                    className={`badge ${a.isActive ? "green" : "gray"}`}
                  >
                    {a.isActive ? "Active" : "Historical"}
                  </span>
                </td>

                <td>
                  {new Date(a.assignedFrom).toLocaleDateString()}
                </td>

                <td>
                  {a.assignedTo
                    ? new Date(a.assignedTo).toLocaleDateString()
                    : "—"}
                </td>

                <td>
                  {a.isActive ? (
                    <button
                      type="button"
                      className="btn"
                      onClick={() => openEdit(a)}
                    >
                      Edit / Reassign
                    </button>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}

            {assignments.length === 0 && (
              <tr>
                <td colSpan={7}>No assignments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="form edit-assignment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-assignment-title"
          >
            <h2
              id="edit-assignment-title"
              style={{ margin: 0 }}
            >
              Edit / Reassign subject
            </h2>

            <p className="muted">
              Saving closes the current assignment and creates a new
              assignment-history entry. Published content and versions
              are not deleted.
            </p>

            {error && (
              <div className="error" role="alert">{error}</div>
            )}

            <form onSubmit={saveEdit}>
              <div className="field">
                <label htmlFor="edit-assignment-staff">
                  Staff member
                </label>

                <select
                  id="edit-assignment-staff"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  required
                >
                  {staff.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="edit-assignment-subject">
                  Subject
                </label>

                <select
                  id="edit-assignment-subject"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  required
                >
                  {subjects.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="edit-assignment-year">
                  Academic year
                </label>

                <input
                  id="edit-assignment-year"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2027-28"
                  pattern="\d{4}-\d{2}"
                  required
                />
              </div>

              <div className="actions">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Save reassignment"}
                </button>

                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setEditing(null);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}