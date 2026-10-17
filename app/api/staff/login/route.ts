import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, getCurrentStaff } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  // A browser already holding a valid staff session must log out before switching accounts.
  const currentStaff = await getCurrentStaff();
  if (currentStaff) {
    return NextResponse.json(
      { error: `You are already signed in as ${currentStaff.email}. Please log out before signing in to another account.` },
      { status: 409 },
    );
  }
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid login request." }, { status: 400 }); }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  if (email.length > 254 || password.length > 128 || !email || !password) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const staff = await prisma.staff.findUnique({ where: { email } });
  const valid = staff ? await bcrypt.compare(password, staff.passwordHash) : false;
  if (!staff || !valid || staff.isDeleted) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  await createSession(staff.id);
  return NextResponse.json({ ok: true, redirect: staff.role === "ADMIN" ? "/admin" : "/staff/dashboard" });
}
