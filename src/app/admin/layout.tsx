import AdminPage from "@/components/AdminPage";
import ReduxProvider from "@/components/ReduxProvider";
import { connect } from "@/config/database/mongoDBConfig";
import { Event } from "@/models/Event";
import { Verifier } from "@/models/Verifier";
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

  const events=await Event.find();
  const verifiers=await Verifier.find();
  console.log(events,verifiers);

  return (
    <ReduxProvider>
    {children}
    <AdminPage events={events} verifiers={verifiers}/>
    </ReduxProvider>
  );
}
