import AdminEventPage from "@/components/AdminEventPage";
import AdminPage from "@/components/AdminPage";
import ReduxProvider from "@/components/ReduxProvider";
import { connect } from "@/config/database/mongoDBConfig";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Verifier } from "@/models/Verifier";
import E from "@/types/Event";
import { create } from "domain";
import type { Metadata } from "next";
Verifier;
connect();

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode,
  params:{event:string}
}>) {;
    const event:E=JSON.parse(JSON.stringify(await Event.findById(params.event).populate("verifiers.verifier")));
    for(let i=0;i<event.verifiers.length;i++){
        event.verifiers[i].attended=await User.find({[`events.${event._id}.verifier`]:event.verifiers[i].verifier._id,[`events.${event._id}.status`]:true}).countDocuments();
    }
    console.log(event);
  return (
    <>
    {children}
    <AdminEventPage event={event}/>
    </>
  );
}

export async function generateMetadata({params}:{params:{event:string}}): Promise<Metadata> {
    const event=JSON.parse(JSON.stringify(await Event.findById(params.event)));
  return {
    title:event.title+" | Event Management - GBPUAT",
    description: event.description,
  };
}