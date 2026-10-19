import type { Metadata } from "next";
import "./globals.css";
import AuthenticatedShell from "@/components/shell/AuthenticatedShell";

export const metadata: Metadata = { title: "Agni Education Advisor", description: "Private consultation review" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AuthenticatedShell>{children}</AuthenticatedShell></body></html>;
}
