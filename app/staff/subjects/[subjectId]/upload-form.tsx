"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadForm({
  subjectId,
  contents,
}: {
  subjectId: string;
  contents: { id: string; title: string; type: string }[];
}) {
  const router = useRouter();

  const [mode, setMode] = useState("new");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("STUDY_MATERIAL");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (busy) return;

    // Capture the form before awaiting the request.
    const form = e.currentTarget;
    const formData = new FormData(form);

    formData.set("subjectId", subjectId);
    formData.set("action", mode);

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/content", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed. Please try again.");
        return;
      }

      setSuccess(
        mode === "new"
          ? "Resource published successfully."
          : "New version uploaded successfully."
      );

      // Clear the form after a successful upload.
      form.reset();
      setMode("new");

      // Re-fetch the server-rendered subject and resource list.
      router.refresh();
    } catch (err) {
      console.error("Resource upload failed:", err);
      setError("Unable to upload the resource. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={submit}>
      <div>
        <h2 style={{ margin: "0 0 5px" }}>
          {mode === "new"
            ? "Publish a resource"
            : "Upload a new version"}
        </h2>

        <p className="muted" style={{ margin: 0 }}>
          Documents up to 50 MB can be uploaded while developing locally.
        </p>
      </div>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="success" role="status">
          {success}
        </div>
      )}

      <div className="two-col">
        <div className="field">
          <label htmlFor="upload-action">Action</label>
          <select
            id="upload-action"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            disabled={busy}
          >
            <option value="new">Publish new resource</option>
            <option value="version">Upload new version</option>
          </select>
        </div>

        <div className="field">
          {mode === "version" && (
            <>
              <label htmlFor="upload-content">Existing resource</label>
              <select
                id="upload-content"
                name="contentId"
                required
                defaultValue=""
                disabled={busy}
              >
                <option value="" disabled>
                  Select resource
                </option>

                {contents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="field">
          <label htmlFor="upload-title">Title</label>
          <input
            id="upload-title"
            name="title"
            required
            maxLength={150}
            disabled={busy}
          />
        </div>

        <div className="field">
          <label htmlFor="upload-type">Type</label>
          <select
            id="upload-type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={busy}
          >
            <option value="QUESTION_PAPER">Question Paper</option>
            <option value="VIDEO_TUTORIAL">Video Tutorial</option>
            <option value="STUDY_MATERIAL">Study Material</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="NOTES">Notes</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="upload-description">Description</label>
        <textarea
          id="upload-description"
          name="description"
          placeholder="Brief description of this resource"
          disabled={busy}
        />
      </div>

      <div className="field">
        <label htmlFor="upload-change-note">Change note</label>
        <input
          id="upload-change-note"
          name="changeNote"
          placeholder="e.g. Updated for 2027 syllabus"
          disabled={busy}
        />
      </div>

      <div className="field">
        <label htmlFor="upload-file">File</label>

        <input
            key={type}
            id="upload-file"
            name="file"
            type="file"
            required
            disabled={busy}
            accept={
            type === "VIDEO_TUTORIAL"
                ? ".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
                : ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.png,.jpg,.jpeg"
            }
        />

        <p className="muted">
            {type === "VIDEO_TUTORIAL"
            ? "Upload a video file only (MP4, WebM, or MOV)."
            : "Upload a document, image, or ZIP file. Video files are not accepted for this resource type."}
        </p>
     </div>

      <button className="btn primary" type="submit" disabled={busy}>
        {busy
          ? "Uploading…"
          : mode === "new"
            ? "Upload & publish"
            : "Upload new version"}
      </button>
    </form>
  );
}
