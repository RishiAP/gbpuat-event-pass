import AdminPage from "@/components/AdminPage";
import AppBar from "@/components/AppBar";
import ReduxProvider from "@/components/ReduxProvider";
import { connect } from "@/config/database/mongoDBConfig";
import { Event } from "@/models/Event";
import { Verifier } from "@/models/Verifier";
import { create } from "domain";
import type { Metadata } from "next";
connect();

export const metadata: Metadata = {
  title: "Admin Panel | Event Management - GBPUAT",
  description: "GBPUAT event management system admin panel",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const events=JSON.parse(JSON.stringify(await Event.find()));
  const verifiers=JSON.parse(JSON.stringify(await Verifier.find()));
  
  return (
    <ReduxProvider>
      <AppBar/>
    {children}
    <AdminPage events={events} verifiers={verifiers}/>
    </ReduxProvider>
  );
}
