import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Anz Chinese Flashcards",
  description: "HSK4 flashcards + quiz demo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
