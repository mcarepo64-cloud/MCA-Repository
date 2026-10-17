import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const admin = await getCurrentStaff();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const semesterId = String(body.semesterId || "");
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  if (!semesterId || !/^[A-Z0-9_-]{2,30}$/.test(code) || !name || name.length > 160) {
    return NextResponse.json({ error: "Enter a valid subject code and name." }, { status: 400 });
  }
  if (!(await prisma.semester.findUnique({ where: { id: semesterId } }))) {
    return NextResponse.json({ error: "Semester not found." }, { status: 404 });
  }
  try {
    await prisma.subject.create({ data: { semesterId, code, name } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "A subject with this code already exists in that semester." }, { status: 409 });
  }
}
