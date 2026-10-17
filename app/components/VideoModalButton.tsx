"use client";

import { useState } from "react";
import Modal from "@/app/components/VideoModal";

type VideoModalButtonProps = {
  versionId: string;
  title: string;
};

export default function VideoModalButton({
  versionId,
  title,
}: VideoModalButtonProps) {
  const [open, setOpen] = useState(false);

  const videoUrl = `/api/content/${encodeURIComponent(versionId)}/view`;

  return (
    <>
      <button
        type="button"
        className="btn small"
        onClick={() => setOpen(true)}
      >
        ▶ Watch
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        maxWidth="1000px"
      >
        <video
          key={videoUrl}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          preload="metadata"
          style={{
            display: "block",
            width: "100%",
            maxHeight: "70vh",
            background: "#000",
            borderRadius: "8px",
          }}
        >
          Your browser does not support video playback.
        </video>
      </Modal>
    </>
  );
}