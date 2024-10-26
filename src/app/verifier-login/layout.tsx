import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifier Login | Event Management - GBPUAT",
  description: "Verifier Login for GBPUAT event management system",
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
