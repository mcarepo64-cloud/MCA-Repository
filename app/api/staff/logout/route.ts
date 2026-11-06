import { NextResponse } from "next/server";
import { logout } from "@/lib/auth";
import { hasTrustedOrigin } from "@/lib/request-security";

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "Untrusted request origin." }, { status: 403 });
  await logout();
  const response = NextResponse.redirect(
    new URL("/staff/login", req.url),
    303,
  );

  return response;
}
