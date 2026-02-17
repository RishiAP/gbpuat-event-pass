import type { Metadata } from "next";
import './globals.css'

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
