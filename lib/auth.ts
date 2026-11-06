import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";

const COOKIE_NAME = "mca_staff_session";
const TOKEN_ISSUER = "mca-open-repository";
const TOKEN_AUDIENCE = "mca-open-repository-users";

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET must be set to a random secret of at least 32 characters in production.");
    }
    return new TextEncoder().encode("local-development-only-secret-not-for-production");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(staffId: string) {
  const token = await new SignJWT({ staffId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setSubject(staffId)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function getCurrentStaff() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      !payload.staffId ||
      typeof payload.staffId !== "string" ||
      payload.sub !== payload.staffId
    ) {
      return null;
    }

    const staff = await prisma.staff.findUnique({
      where: { id: payload.staffId },
      include: {
        program: true,
        assignments: {
          where: {
            isActive: true,
            assignedTo: null,
          },
          include: {
            subject: {
              include: {
                semester: true,
              },
            },
          },
        },
      },
    });

    if (!staff || staff.isDeleted) return null;

    return staff;
  } catch {
    return null;
  }
}

export async function logout() {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
