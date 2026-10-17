import {redirect} from "next/navigation";import {getCurrentStaff} from "@/lib/auth";import {prisma} from "@/lib/prisma";import StaffForm from "./staff-form";
import { deleteStaff, restoreStaff } from "./actions";
export default async function Page(){const admin=await getCurrentStaff();if(!admin||admin.role!=="ADMIN")redirect(admin?"/staff/dashboard":"/staff/login");const [staff,programs]=await Promise.all([prisma.staff.findMany({include:{program:true},orderBy:{name:"asc"}}),prisma.program.findMany({orderBy:{name:"asc"}})]);return <main className="page"><div className="container"><div className="topbar"><div><h1>Staff management</h1><p className="muted">Create teacher accounts. Assignments are managed separately.</p></div></div><StaffForm programs={programs.map(p=>({id:p.id,name:p.name}))}/><div className="section-title"><h2>Staff accounts</h2></div>

<div className="table-wrap">
  <table className="table">
    <thead>
      <tr>
        <th>Name</th>
        <th>Email</th>
        <th>Programme</th>
        <th>Role</th>
        <th>Status</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>
      {staff.map((s) => (
        <tr key={s.id}>
          <td>{s.name}</td>
          <td>{s.email}</td>
          <td>{s.program.name}</td>
          <td>
            <span className="badge">{s.role}</span>
          </td>

          <td>
            <span className="badge">
              {s.isDeleted ? "Deleted" : "Active"}
            </span>
          </td>

          <td>
            {new Date(s.createdAt).toLocaleDateString()}
          </td>

          <td>
            {s.isDeleted ? (
              <form action={restoreStaff}>
                <input
                  type="hidden"
                  name="id"
                  value={s.id}
                />
                <button type="submit">
                  Restore
                </button>
              </form>
            ) : (
              <form action={deleteStaff}>
                <input
                  type="hidden"
                  name="id"
                  value={s.id}
                />
                <button type="submit">
                  Delete
                </button>
              </form>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
</div></main>}
