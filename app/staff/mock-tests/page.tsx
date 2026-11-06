import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentStaff } from "@/lib/auth";
import MockTestManagement from "./mock-test-management";

export default async function MockTestsPage() {
  const staff = await getCurrentStaff();

  if (!staff) redirect("/staff/login");
  if (staff.isDeleted) redirect("/staff/login");

  return (
    <main className="mock-management-page">
  <div className="mock-management-container">
    <div className="mock-management-heading">
  <div>
    <span className="mock-management-eyebrow">STAFF PORTAL</span>
    <h1>Mock Test Management</h1>
    <p>Manage your mock tests, publication status and attempts.</p>
  </div>

  <Link className="btn primary mock-create-button" href="/staff/mock-tests/create">
    + Create Mock Test
  </Link>
</div>
    <MockTestManagement />
  </div>
</main>
  );
}