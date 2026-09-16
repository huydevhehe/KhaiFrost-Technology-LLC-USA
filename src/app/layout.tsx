import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "KhaiFrost Technology — Build Smarter with AI",
  description:
    "We create AI-powered tools and digital solutions that help businesses move faster, work smarter and grow sustainably.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
