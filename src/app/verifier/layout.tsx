import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verifier Panel | Event Management - GBPUAT",
  description: "GBPUAT event management system verifier panel",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  return (
    children
  );
}
