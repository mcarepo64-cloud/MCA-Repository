"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StaffForm({
  programs,
}: {
  programs: { id: string; name: string }[];
}) {
  const r = useRouter();

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    setBusy(true);
    setMsg("");
    setErr("");

    // Capture the form before awaiting the API request.
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(formData)),
      });

      const d = await res.json();

      if (!res.ok) {
        setErr(d.error || "Could not create staff");
        return;
      }

      setMsg("Staff account created successfully.");
      form.reset();

      // Refresh the Server Component data so the new staff appears.
      r.refresh();
    } catch (error) {
      console.error("Staff creation failed:", error);
      setErr("Something went wrong. Please try again.");
    } finally {
      // Always stop the loading state, even if an error occurs.
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <h2 style={{ margin: 0 }}>Create staff account</h2>

      {err && <div className="error">{err}</div>}
      {msg && <div className="success">{msg}</div>}

      <div className="two-col">
        <div className="field">
          <label>Full name</label>
          <input name="name" required />
        </div>

        <div className="field">
          <label>Email</label>
          <input name="email" type="email" required />
        </div>
      </div>

      <div className="two-col">
        <div className="field">
          <label>Temporary password</label>
          <input
            name="password"
            type="password"
            minLength={8}
            required
          />
        </div>

        <div className="field">
          <label>Programme</label>
          <select name="programId" required defaultValue="">
            <option value="" disabled>
              Select programme
            </option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button className="btn primary" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create staff"}
      </button>
    </form>
  );
}