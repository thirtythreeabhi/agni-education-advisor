import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const user = (await auth())?.user;
  if (!user) redirect("/login");
  redirect(user.role === "admin" ? "/admin" : "/family");
}
