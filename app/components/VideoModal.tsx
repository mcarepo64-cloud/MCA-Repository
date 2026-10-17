"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidth?: string;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "900px",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.75)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--card, white)",
          color: "var(--foreground, #171717)",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #ddd)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px" }}>{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              border: 0,
              background: "transparent",
              fontSize: "28px",
              lineHeight: 1,
              cursor: "pointer",
              padding: "2px 8px",
              color: "inherit",
            }}
          >
            ×
          </button>
        </header>

        <div style={{ padding: "20px" }}>{children}</div>
      </section>
    </div>
  );
}