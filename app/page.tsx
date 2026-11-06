import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const dept = await prisma.department.findUnique({
    where: { code: "MCA" },
    include: {
      programs: {
        include: {
          semesters: {
            include: {
              _count: { select: { subjects: true } },
            },
          },
        },
        orderBy: { type: "asc" },
      },
    },
  });

  return (
    <main className="page">
      <div className="container">
        <section className="hero">
          <div className="eyebrow">Department of Computer Applications</div>
          <h1>MCA Open Repository</h1>
          <p>
            One place for question papers, study materials, assignments, notes
            and video tutorials.
          </p>
        </section>

                {/* Programmes */}
        <section className="home-section">
          <div className="section-title">
            <div>
              <h2>Choose a programme</h2>
              <p className="muted">Browse semesters and subjects.</p>
            </div>
          </div>

          <div className="home-grid">
            {dept?.programs.map((p) => (
              <Link className="home-card" key={p.id} href={`/program/${p.id}`}>
                <span className="badge">{p.type}</span>
                <h2>{p.name}</h2>
                <p className="muted">
                  {p.semesters.length} semesters ·{" "}
                  {p.semesters.reduce((n, s) => n + s._count.subjects, 0)} subjects
                </p>
                <span className="btn">Open programme →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Mock Tests */}
        <section className="home-section">
          <div className="section-title">
            <div>
              <h2>Mock Tests</h2>
              <p className="muted">
                Practise your knowledge with subject-wise mock tests.
              </p>
            </div>
          </div>

          <div className="home-grid">
            <Link href="/mock-tests" className="home-card mock-test-card">
              <span className="badge">Practice</span>
              <h2>Explore Mock Tests</h2>
              <p className="muted">
                Attempt MCQ tests, get instant results, review your answers
                and track your performance.
              </p>
              <span className="btn">View Mock Tests →</span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}