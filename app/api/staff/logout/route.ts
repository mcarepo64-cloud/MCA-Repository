import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  await logout();
  return NextResponse.redirect(new URL("/staff/login", process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin), 303);
}
