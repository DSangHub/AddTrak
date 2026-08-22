import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AddTrak | Move inventory. Build loyalty.",
  description: "AddTrak helps businesses promote slow-moving inventory and build membership programs customers can earn back through qualifying purchases.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><ClerkProvider>{children}</ClerkProvider></body>
    </html>
  );
}
