import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import AssignmentForm from "./assignment-form";
import AssignmentHistory from "./assignment-history";

export default async function Page() {
  const admin = await getCurrentStaff();

  if (!admin) redirect("/staff/login");
  if (admin.role !== "ADMIN") redirect("/staff/dashboard");

  const [staff, subjects, assignments] = await Promise.all([
    prisma.staff.findMany({
      where: {
        role: "STAFF",
        isDeleted: false,
      },
      orderBy: { name: "asc" },
    }),

    prisma.subject.findMany({
      include: {
        semester: {
          include: { program: true },
        },
      },
      orderBy: { code: "asc" },
    }),

    prisma.staffSubject.findMany({
      include: {
        staff: true,
        subject: {
          include: {
            semester: {
              include: { program: true },
            },
          },
        },
      },
      orderBy: { assignedFrom: "desc" },
    }),
  ]);

  const staffOptions = staff.map((x) => ({
    id: x.id,
    name: x.name,
  }));

  const subjectOptions = subjects.map((x) => ({
    id: x.id,
    label: `${x.semester.program.name} / Sem ${x.semester.number} / ${x.code} — ${x.name}`,
  }));

  const assignmentRows = assignments.map((a) => ({
    id: a.id,
    staffId: a.staffId,
    staffName: a.staff.name,
    subjectId: a.subjectId,
    subjectCode: a.subject.code,
    subjectName: a.subject.name,
    programName: a.subject.semester.program.name,
    subjectLabel: `${a.subject.semester.program.name} / Sem ${a.subject.semester.number} / ${a.subject.code} — ${a.subject.name}`,
    academicYear: a.academicYear,
    isActive: a.isActive,
    assignedFrom: a.assignedFrom.toISOString(),
    assignedTo: a.assignedTo?.toISOString() ?? null,
  }));

  return (
    <main className="page">
      <div className="container">
        <p className="breadcrumb">
          <Link href="/admin">Admin</Link> / Assignments
        </p>

        <div className="topbar">
          <div>
            <h1>Subject assignments</h1>

            <p className="muted">
              Assign the current teacher. Reassignments close the previous
              assignment while retaining history and published repository
              content.
            </p>
          </div>
        </div>

        <AssignmentForm
          staff={staffOptions}
          subjects={subjectOptions}
        />

        <div className="section-title">
          <div>
            <h2>Assignment history</h2>
          </div>
        </div>

        <AssignmentHistory
          assignments={assignmentRows}
          staff={staffOptions}
          subjects={subjectOptions}
        />
      </div>
    </main>
  );
}