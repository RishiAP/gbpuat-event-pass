import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "GBPUAT Event Management System",
  description: "Manage and verify event attendance seamlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              duration: 5000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
