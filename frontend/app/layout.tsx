import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Krypta - Secure Secret Manager",
  description: "Secure, granular, isolated developer secret manager app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body suppressHydrationWarning className="bg-bg-main text-text-primary min-h-full flex flex-col antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1a1d26',
              color: '#f1f1f1',
              border: '1px solid #2a2d35',
              fontSize: '13px',
              fontFamily: 'ui-sans-serif, system-ui, sans-serif',
              borderRadius: '6px',
            },
            success: {
              iconTheme: {
                primary: '#1d9e75',
                secondary: '#1a1d26',
              },
            },
            error: {
              iconTheme: {
                primary: '#d85a30',
                secondary: '#1a1d26',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
