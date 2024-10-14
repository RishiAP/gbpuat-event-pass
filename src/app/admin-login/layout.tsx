import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login | Event Management - GBPUAT",
  description: "Admin Login for GBPUAT event management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    children
  );
}
