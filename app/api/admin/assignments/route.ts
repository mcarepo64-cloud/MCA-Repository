import { NextResponse } from "next/server";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasTrustedOrigin } from "@/lib/request-security";

function parseAssignmentBody(body: Record<string, unknown>) {
  const staffId = String(body.staffId || "");
  const subjectId = String(body.subjectId || "");
  const academicYear = String(body.academicYear || "");

  if (
    !staffId ||
    !subjectId ||
    !/^[0-9]{4}-[0-9]{2}$/.test(academicYear)
  ) {
    return {
      error: "Select staff, subject and a valid academic year.",
    } as const;
  }

  return { staffId, subjectId, academicYear } as const;
}

async function validateTarget(staffId: string, subjectId: string) {
  const [staff, subject] = await Promise.all([
    prisma.staff.findUnique({
      where: { id: staffId },
    }),

    prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        semester: {
          include: { program: true },
        },
      },
    }),
  ]);

  if (!staff || staff.role !== "STAFF" || staff.isDeleted) {
    return { error: "Select an active staff account." } as const;
  }

  if (!subject) {
    return { error: "Subject not found." } as const;
  }

  // if (subject.semester.programId !== staff.programId) {
  //   return {
  //     error: "Staff and subject belong to different programmes.",
  //   } as const;
  // }

  return { staff, subject } as const;
}

export async function POST(req: Request) {
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Untrusted request origin." },
      { status: 403 }
    );
  }

  const admin = await getCurrentStaff();

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin login required." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = parseAssignmentBody(body);

  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400 }
    );
  }

  const target = await validateTarget(
    parsed.staffId,
    parsed.subjectId
  );

  if ("error" in target) {
    return NextResponse.json(
      { error: target.error },
      { status: 400 }
    );
  }

  const existing = await prisma.staffSubject.findFirst({
    where: {
      staffId: parsed.staffId,
      subjectId: parsed.subjectId,
      academicYear: parsed.academicYear,
      isActive: true,
    },
  });

  if (existing) {
    return NextResponse.json(
      {
        error:
          "This staff member is already actively assigned to that subject for this academic year.",
      },
      { status: 409 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffSubject.updateMany({
      where: {
        subjectId: parsed.subjectId,
        isActive: true,
      },
      data: {
        isActive: false,
        assignedTo: new Date(),
      },
    });

    await tx.staffSubject.create({
      data: {
        staffId: parsed.staffId,
        subjectId: parsed.subjectId,
        academicYear: parsed.academicYear,
        isActive: true,
      },
    });
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: Request) {
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json(
      { error: "Untrusted request origin." },
      { status: 403 }
    );
  }

  const admin = await getCurrentStaff();

  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin login required." },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const assignmentId = String(body.assignmentId || "");
  const parsed = parseAssignmentBody(body);

  if (!assignmentId) {
    return NextResponse.json(
      { error: "Assignment ID is required." },
      { status: 400 }
    );
  }

  if ("error" in parsed) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400 }
    );
  }

  const current = await prisma.staffSubject.findUnique({
    where: { id: assignmentId },
  });

  if (!current) {
    return NextResponse.json(
      { error: "Assignment not found." },
      { status: 404 }
    );
  }

  if (!current.isActive) {
    return NextResponse.json(
      {
        error:
          "Historical assignments cannot be edited. Edit the active assignment instead.",
      },
      { status: 409 }
    );
  }

  const target = await validateTarget(
    parsed.staffId,
    parsed.subjectId
  );

  if ("error" in target) {
    return NextResponse.json(
      { error: target.error },
      { status: 400 }
    );
  }

  if (
    current.staffId === parsed.staffId &&
    current.subjectId === parsed.subjectId &&
    current.academicYear === parsed.academicYear
  ) {
    return NextResponse.json(
      { error: "No changes were made." },
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();

    // Close the old assignment; retain it as history.
    await tx.staffSubject.update({
      where: { id: current.id },
      data: {
        isActive: false,
        assignedTo: now,
      },
    });

    // Close any existing active assignment for the target subject.
    await tx.staffSubject.updateMany({
      where: {
        subjectId: parsed.subjectId,
        isActive: true,
      },
      data: {
        isActive: false,
        assignedTo: now,
      },
    });

    // Create a new row instead of overwriting assignment history.
    await tx.staffSubject.create({
      data: {
        staffId: parsed.staffId,
        subjectId: parsed.subjectId,
        academicYear: parsed.academicYear,
        isActive: true,
        assignedFrom: now,
      },
    });
  });

  return NextResponse.json({ ok: true });
}