import "~/styles/globals.css";

import { Inter as FontSans } from "next/font/google";

import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import { cn } from "~/lib/utils";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "8 App",
  description: "8 App",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
      <html
        lang="en"
        className={cn(
          "dark",
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <body>
          <TRPCReactProvider>
            {children}
          </TRPCReactProvider>
        </body>
      </html>
  );
}
