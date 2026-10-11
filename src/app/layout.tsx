import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Agni Education Advisor", description: "Private consultation review" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
