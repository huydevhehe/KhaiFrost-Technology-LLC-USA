import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { I18nProvider } from "@/components/I18nProvider";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { siteConfig } from "@/content/siteConfig";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const siteUrl = "https://khaifrost.vn";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "KhaiFrost Technology LLC — AI Software & Cloud Development in Houston, TX & Vietnam",
  description:
    "KhaiFrost Technology LLC builds AI-powered software, AWS cloud infrastructure, cybersecurity and custom applications for businesses in Houston, Texas, USA and worldwide.",
  keywords: [
    "AI software development Houston",
    "AWS cloud consulting Texas",
    "custom software development company USA",
    "KhaiFrost Technology",
    "AI development Vietnam",
  ],
  openGraph: {
    title: "KhaiFrost Technology LLC — AI Software & Cloud Development",
    description:
      "AI-powered software, cloud infrastructure and automation for businesses in Houston, TX, USA and worldwide.",
    url: siteUrl,
    siteName: "KhaiFrost Technology LLC",
    locale: "en_US",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "KhaiFrost Technology LLC",
  url: siteUrl,
  email: siteConfig.email,
  telephone: siteConfig.phone,
  location: siteConfig.offices.map((office) => ({
    "@type": "LocalBusiness",
    name: `KhaiFrost Technology LLC — ${office.city} Office`,
    address: {
      "@type": "PostalAddress",
      streetAddress: office.street,
      addressLocality: office.city,
      addressRegion: office.state,
      postalCode: office.zip || undefined,
      addressCountry: office.countryCode,
    },
  })),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
