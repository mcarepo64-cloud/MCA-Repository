import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MockQuestionUpload from "./mock-question-upload";

export default async function MockQuestionsPage() {
  const staff = await getCurrentStaff();

  if (!staff || staff.isDeleted) {
    redirect("/staff/login");
  }

  const isAdmin = staff.role === "ADMIN";

  const subjects = isAdmin
  ? await prisma.subject.findMany({
      include: {
        semester: {
          include: {
            program: true,
          },
        },
      },
      orderBy: [{ code: "asc" }],
    })
  : staff.assignments
      .filter((assignment) => assignment.isActive && !assignment.assignedTo)
      .map((assignment) => assignment.subject);

  const subjectOptions = subjects.map((subject) => ({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        semester: `Semester ${subject.semester.number}`,
        program: "",
        }));

  return (
  <main className="mock-questions-page">
    <div className="mock-questions-container">
      <p className="mock-questions-breadcrumb">
        <Link href="/staff/dashboard">Dashboard</Link>
        <span>/</span>
        Mock Test Questions
      </p>

      <div className="mock-questions-heading">
        <div>
          <span className="mock-questions-badge">
            {isAdmin ? "Administrator" : "Assigned Subjects"}
          </span>

          <h1>Mock Test Question Bank</h1>

          <p>
            Upload MCQ questions using the CSV template and manage the
            questions available for mock tests.
          </p>
        </div>
      </div>

      {subjectOptions.length === 0 ? (
        <div className="mock-questions-empty">
          No subjects are currently assigned to you.
        </div>
      ) : (
        <MockQuestionUpload
          subjects={subjectOptions}
          isAdmin={isAdmin}
        />
      )}
    </div>
  </main>
);
}