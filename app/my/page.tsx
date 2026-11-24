import { redirect } from "next/navigation";
import { getSessionTreeId } from "@/lib/session";

export default async function My() {
  const id = await getSessionTreeId();
  redirect(id ? `/t/${id}` : "/login");
}
