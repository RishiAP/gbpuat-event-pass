import { NextRequest, NextResponse } from 'next/server';
import { connect } from '@/config/database/mongoDBConfig';
import mongoose from 'mongoose';
import { Event, IEvent } from '@/models/Event';
import { getUserFromHeader } from '@/helpers/common_func';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connect();
    const admin=await getUserFromHeader(req,true);
    if(admin==null){
        return NextResponse.json({error:"Unauthorized"},{status:401});
    }
    const { eventId } = await params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

  const ev = await Event.findById(eventId).lean<IEvent>();
    if (!ev) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const totalRegistrations = ev.participants || 0;
    const withInvitation = ev.invitations_generated || 0;
    const withIdCard = ev.id_card_generated || 0;
    const attendedCount = ev.attended || 0;
    const faculties = ev.faculties || 0;
    const students = Math.max(0, totalRegistrations - faculties);

    const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

    const attendancePercentage = pct(attendedCount, totalRegistrations);
    const invitationPercentage = pct(withInvitation, totalRegistrations);
    const idCardPercentage = pct(withIdCard, totalRegistrations);

    return NextResponse.json({
      summary: {
        totalRegistrations,
        withInvitation,
        withIdCard,
        attendedCount,
        attendancePercentage,
        invitationPercentage,
        idCardPercentage,
        faculties,
        students,
      },
      event: {
        _id: ev._id,
        title: ev.title,
        date: ev.date,
        status: ev.status,
      },
    });
  } catch (error) {
    console.error('Error fetching event summary:', error);
    return NextResponse.json({ error: 'Failed to fetch event summary' }, { status: 500 });
  }
}
