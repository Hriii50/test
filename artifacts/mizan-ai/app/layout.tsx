import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../src/index.css";

export const metadata: Metadata = {
  title: "MIZAN AI — ميزان",
  description: "مساحتك المالية لفهم دخلك ومصروفاتك وأهدافك.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
