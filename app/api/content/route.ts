import { NextResponse } from "next/server";
import { ContentType, Prisma } from "@prisma/client";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, saveFile, validateUpload } from "@/lib/storage";
import { hasTrustedOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const staff = await getCurrentStaff();
  if (!staff || staff.role !== "STAFF") return NextResponse.json({ error: "Staff login required" }, { status: 401 });

  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Invalid upload request." }, { status: 400 }); }
  const subjectId = String(form.get("subjectId") || "");
  if (!staff.assignments.some((assignment) => assignment.subjectId === subjectId)) {
    return NextResponse.json({ error: "You are not currently assigned to this subject." }, { status: 403 });
  }

  const title = String(form.get("title") || "").trim();
  const type = String(form.get("type") || "");
  const file = form.get("file");
  const action = String(form.get("action") || "new");
  const description = String(form.get("description") || "").trim().slice(0, 5000) || null;
  const changeNote = String(form.get("changeNote") || "").trim().slice(0, 1000) || null;
  if (!title || title.length > 150 || !Object.values(ContentType).includes(type as ContentType)) {
    return NextResponse.json({ error: "Enter a title (maximum 150 characters) and valid type." }, { status: 400 });
  }
  if (action !== "new" && action !== "version") return NextResponse.json({ error: "Invalid upload action." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file." }, { status: 400 });
  const fileError = validateUpload(file);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  let contentId = String(form.get("contentId") || "");
  if (action === "version") {
    const existing = await prisma.content.findFirst({ where: { id: contentId, subjectId, isArchived: false } });
    if (!existing) return NextResponse.json({ error: "Resource not found in this subject." }, { status: 404 });
    contentId = existing.id;
  }

  let saved: Awaited<ReturnType<typeof saveFile>> | undefined;
  try {
    saved = await saveFile(file);
    await prisma.$transaction(async (tx) => {
      if (action === "new") {
        const created = await tx.content.create({ data: { title, description, type: type as ContentType, subjectId } });
        contentId = created.id;
      } else {
        await tx.content.update({ where: { id: contentId }, data: { title, description, type: type as ContentType } });
      }
      const latest = await tx.contentVersion.aggregate({ where: { contentId }, _max: { versionNumber: true } });
      await tx.contentVersion.create({ data: {
        contentId,
        versionNumber: (latest._max.versionNumber || 0) + 1,
        fileName: saved!.fileName,
        storageKey: saved!.key,
        mimeType: saved!.mimeType,
        sizeBytes: saved!.sizeBytes,
        uploadedById: staff.id,
        changeNote,
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    return NextResponse.json({ ok: true, contentId });
  } catch (error) {
    if (saved) {
      try { await deleteStoredFile(saved.key); } catch { /* keep original error; orphan cleanup can be handled operationally */ }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
      return NextResponse.json({ error: "Another version was uploaded at the same time. Please retry." }, { status: 409 });
    }
    return NextResponse.json({ error: "The file could not be published. Please try again." }, { status: 500 });
  }
}
