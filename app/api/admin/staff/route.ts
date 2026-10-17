import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  const admin = await getCurrentStaff();
  if (!admin || admin.role !== "ADMIN") return NextResponse.json({ error: "Admin login required" }, { status: 401 });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }); }
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const programId = String(body.programId || "");
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length < 12 || password.length > 128 || !programId) {
    return NextResponse.json({ error: "Enter valid details. Password must be 12–128 characters." }, { status: 400 });
  }
  if (!(await prisma.program.findUnique({ where: { id: programId } }))) {
    return NextResponse.json({ error: "Invalid programme." }, { status: 400 });
  }
  if (await prisma.staff.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "A staff account with this email already exists." }, { status: 409 });
  }
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await prisma.staff.create({ data: { name, email, passwordHash, programId, role: "STAFF" } });
  } catch {
    return NextResponse.json({ error: "Unable to create staff account." }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
