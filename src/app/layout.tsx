import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "GBPUAT Event Management System",
  description: "Manage and verify event attendance seamlessly.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let currentTheme: "dark" | "light" | undefined = undefined;
  const theme = (await cookies()).get("theme")?.value;
  if (theme == "dark" || theme == "light") currentTheme = theme;
  return (
    <html lang="en" className={currentTheme === "dark" ? "dark" : ""}>
      <body>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            duration: 5000,
          }}
        />
      </body>
    </html>
  );
}
