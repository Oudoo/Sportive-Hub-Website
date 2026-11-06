import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";

/** The root just sends people to the right place. */
export default async function Home() {
  const user = await getSessionUser();
  redirect(!user ? "/login" : user.role === "ADMIN" ? "/admin" : "/portal");
}
