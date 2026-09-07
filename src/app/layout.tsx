import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paid Acquisition Performance",
  description: "Lead source, pipeline, conversion, and revenue performance for paid acquisition.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-page-plane text-ink">{children}</body>
    </html>
  );
}
