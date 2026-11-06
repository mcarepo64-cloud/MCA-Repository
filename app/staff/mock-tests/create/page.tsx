
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MockTestCreateForm from "./mock-test-create-form";

export default async function CreateMockTestPage() {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/staff/login");
  if (staff.isDeleted) redirect("/staff/login");

  const isAdmin = staff.role === "ADMIN";

  const subjects = isAdmin
    ? await prisma.subject.findMany({
        include: { semester: true },
        orderBy: [{ name: "asc" }],
      })
    : staff.assignments.map((assignment) => assignment.subject);

  const subjectOptions = subjects.map((subject) => ({
    id: subject.id,
    code: subject.code,
    name: subject.name,
    semester: `Semester ${subject.semester.number}`,
  }));

  return (
    <main className="mock-create-page">
      <div className="mock-create-container">
        <div className="mock-create-heading">
          <div>
            <div className="mock-create-eyebrow">
              <span className="mock-create-heading-icon">✦</span>
              MOCK TEST MANAGEMENT
            </div>

            <h1>Create Mock Test</h1>

            <p>
              Configure a mock test using questions from your question bank.
              Set the duration, scoring rules and question preferences.
            </p>
          </div>

          <div className="mock-create-heading-badge">
            <span>📝</span>
            New Assessment
          </div>
        </div>

        <MockTestCreateForm subjects={subjectOptions} />
      </div>
    </main>
  );
}
