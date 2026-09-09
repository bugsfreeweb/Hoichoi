"use server";

import { destroySession } from "./auth";
import { redirect } from "next/navigation";

export async function adminLogout() {
  await destroySession();
  redirect("/admin/login");
}