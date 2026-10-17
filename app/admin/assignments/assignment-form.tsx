"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignmentForm({
  staff,
  subjects,
}: {
  staff: { id: string; name: string }[];
  subjects: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;

    const form = e.currentTarget;
    const payload = Object.fromEntries(new FormData(form));

    setBusy(true);
    setErr("");
    setMsg("");

    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setErr(data.error || "Assignment failed.");
        return;
      }

      setMsg("Assignment saved successfully.");
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Assignment request failed:", error);
      setErr("Could not save the assignment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      {err && <div className="error" role="alert">{err}</div>}
      {msg && <div className="success" role="status">{msg}</div>}

      <div className="three-col">
        <div className="field">
          <label htmlFor="assignment-staff">Staff member</label>
          <select
            id="assignment-staff"
            name="staffId"
            required
            defaultValue=""
          >
            <option value="" disabled>Select staff</option>
            {staff.map((s) => (
              <option value={s.id} key={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="assignment-subject">Subject</label>
          <select
            id="assignment-subject"
            name="subjectId"
            required
            defaultValue=""
          >
            <option value="" disabled>Select subject</option>
            {subjects.map((s) => (
              <option value={s.id} key={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="assignment-year">Academic year</label>
          <input
            id="assignment-year"
            name="academicYear"
            placeholder="2027-28"
            pattern="\d{4}-\d{2}"
            required
          />
        </div>
      </div>

      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Assign teacher"}
      </button>
    </form>
  );
}