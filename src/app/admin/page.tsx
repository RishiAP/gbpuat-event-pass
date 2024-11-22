import AdminPage from "@/components/AdminPage";
import { connect } from "@/config/database/mongoDBConfig";
import { Event } from "@/models/Event";
import { Verifier } from "@/models/Verifier";

connect();

export default async function AdminPageWrapper() {
  const events = JSON.parse(JSON.stringify(await Event.find()));
  const verifiers = JSON.parse(JSON.stringify(await Verifier.find()));

  return <AdminPage events={events} verifiers={verifiers} />;
}
