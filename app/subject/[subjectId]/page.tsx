import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import VideoModalButton from "@/app/components/VideoModalButton";
const labels:any={QUESTION_PAPER:"Question Paper",VIDEO_TUTORIAL:"Video Tutorial",STUDY_MATERIAL:"Study Material",ASSIGNMENT:"Assignment",NOTES:"Notes",OTHER:"Other"};
export default async function Page({params}:{params:Promise<{subjectId:string}>}){const {subjectId}=await params;const s=await prisma.subject.findUnique({where:{id:subjectId},include:{semester:{include:{program:true}},contents:{where:{isArchived:false},include:{versions:{orderBy:{versionNumber:"desc"},take:1}},orderBy:{type:"asc"}}}});if(!s)notFound();return <main className="page"><div className="container"><p className="breadcrumb"><Link href={`/semester/${s.semesterId}`}>{s.semester.program.name} · Semester {s.semester.number}</Link> / {s.code}</p><div className="topbar"><div><span className="badge">{s.code}</span><h1>{s.name}</h1><p className="muted">Public resources · view and download</p></div></div>{s.contents.length===0?<div className="empty">No resources have been published for this subject yet.</div>:<div className="list">{s.contents.map(c=>{const v=c.versions[0];return <div className="list-item" key={c.id}><div className="resource"><div className="resource-icon">{c.type==='VIDEO_TUTORIAL'?'▶':'↗'}</div><div className="main"><strong>{c.title}</strong><div className="muted">{labels[c.type]} · Version {v?.versionNumber} · {v?.fileName}</div>{c.description&&<div className="muted">{c.description}</div>}</div></div>{v&&<div className="actions">
{c.type === "VIDEO_TUTORIAL" && (
  <VideoModalButton
    versionId={v.id}
    title={`${c.title} — v${v.versionNumber}`}
  />
)}    <Link className="btn primary small" href={`/api/content/${v.id}/download`}>Download</Link></div>}</div>})}</div>}</div></main>}
