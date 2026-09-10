import type { Metadata } from "next";
import { Montserrat } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GymSynk — gym management by Paradigm Studio",
  description:
    "Members, classes, staff, and billing for modern gyms. White-label dashboards, Stripe memberships, and embeddable schedules.",
  icons: {
    icon: "/gymsynk-fav-02.png",
    apple: "/gymsynk-fav-02-wht.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
