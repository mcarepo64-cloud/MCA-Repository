
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STAFF_PATH = "/admin/staff";

async function requireAdmin() {
  const admin = await getCurrentStaff();

  if (!admin || admin.role !== "ADMIN") {
    redirect("/staff/login");
  }

  return admin;
}

export async function deleteStaff(formData: FormData) {
  const admin = await requireAdmin();
  const id = formData.get("id");

  if (typeof id !== "string" || !id) {
    throw new Error("Invalid staff ID");
  }

  // Prevent the currently logged-in admin from deleting their own account.
  if (admin.id === id) {
    throw new Error("You cannot delete your own account.");
  }

  await prisma.staff.updateMany({
    where: { id, isDeleted: false },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });

  revalidatePath(STAFF_PATH);
}

export async function restoreStaff(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");

  if (typeof id !== "string" || !id) {
    throw new Error("Invalid staff ID");
  }

  await prisma.staff.updateMany({
    where: { id, isDeleted: true },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });

  revalidatePath(STAFF_PATH);
}
