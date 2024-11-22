import AppBar from "@/components/AppBar";
import ReduxProvider from "@/components/ReduxProvider";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel | Event Management - GBPUAT",
  description: "GBPUAT event management system admin panel",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReduxProvider>
      <AppBar />
      {children}
    </ReduxProvider>
  );
}
