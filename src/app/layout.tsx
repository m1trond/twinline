import type { Metadata, Viewport } from "next";
import { Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://hush.vercel.app"),
  title: "Hush",
  applicationName: "Hush",
  description: "Hush - private social space",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/hush-favicon.svg?v=4",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/hush-favicon.svg?v=4",
  },
  openGraph: {
    title: "Hush",
    description: "Hush - private social space",
    siteName: "Hush",
    url: "/",
    images: [
      {
        alt: "Hush",
        height: 512,
        url: "/hush-logo.png",
        width: 512,
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Hush",
    description: "Hush - private social space",
    images: ["/hush-logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${montserrat.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
