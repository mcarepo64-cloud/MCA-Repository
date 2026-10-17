import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  const version = await prisma.contentVersion.findUnique({
    where: { id: versionId },
    include: { content: true },
  });
  if (!version || version.content.isArchived) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  // Only inline-render known safe document/image types. Other formats download instead.
  const inlineTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
  const contentType = inlineTypes.has(version.mimeType) ? version.mimeType : "application/octet-stream";
  try {
    const bytes = await readStoredFile(version.storageKey);
    return new Response(bytes, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": inlineTypes.has(version.mimeType) ? "inline" : "attachment",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Stored file not found" }, { status: 404 });
  }
}
