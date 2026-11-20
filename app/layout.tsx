import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BankKnit | Bank-Issued Verified Name Profiles",
  description: "Create a shareable Verified Name Profile issued by a participating bank or credit union. Banks receive consented local leads and can issue active, expiring badges.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ClerkProvider>{children}</ClerkProvider></body>
    </html>
  );
}
