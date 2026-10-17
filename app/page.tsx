import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const dept = await prisma.department.findUnique({ where: { code: "MCA" }, include: { programs: { include: { semesters: { include: { _count: { select: { subjects: true } } } } }, orderBy: { type: "asc" } } } });
  return <main className="page"><div className="container">
    <section className="hero"><div className="eyebrow">Department of Computer Applications</div><h1>MCA Open Repository</h1><p>One place for question papers, study materials, assignments, notes and video tutorials. Resources stay with the subject so teachers can continue the repository when assignments change.</p></section>
    <div className="section-title"><div><h2>Choose a programme</h2><p className="muted">Browse semesters and subjects.</p></div></div>
    <div className="grid">{dept?.programs.map(p => <Link className="card" key={p.id} href={`/program/${p.id}`}><span className="badge">{p.type}</span><h2>{p.name}</h2><p className="muted">{p.semesters.length} semesters · {p.semesters.reduce((n,s)=>n+s._count.subjects,0)} subjects</p><span className="btn">Open programme →</span></Link>)}</div>
  </div></main>;
}
