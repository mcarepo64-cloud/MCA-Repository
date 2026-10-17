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

  try {
    const bytes = await readStoredFile(version.storageKey);
    const safeName = version.fileName.replace(/[\r\n"\\]/g, "_");
    return new Response(bytes, {
      headers: {
        "Content-Type": version.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(version.fileName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Stored file not found" }, { status: 404 });
  }
}
