import { auth } from "@/auth";
import AppShell from "./AppShell";

export default async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return <>{children}</>;
  return <AppShell user={{ role: session.user.role, name: session.user.name, email: session.user.email }}>{children}</AppShell>;
}
