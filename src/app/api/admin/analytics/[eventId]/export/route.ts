import { NextResponse } from 'next/server';
import { connect } from "@/config/database/mongoDBConfig";
import mongoose from 'mongoose';
import { Parser } from 'json2csv';
import {User} from '@/models/User';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await connect();
    const { eventId } = params;

    // Get all registrations for the event
    const registrations = await User.find({ [`events.${eventId}`]: { $exists: true } })
      .select('name email phone college registrationId isVerified isAttended createdAt')
      .lean();

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: 'No registrations found for this event' },
        { status: 404 }
      );
    }

    // Format data for CSV
    const fields = [
      'name',
      'email',
      'phone',
      'college',
      'registrationId',
      'isVerified',
      'isAttended',
      'createdAt'
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(registrations);

    // Create CSV response
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=event-${eventId}-export-${new Date().toISOString().split('T')[0]}.csv`
      }
    });

  } catch (error) {
    console.error('Error exporting registrations:', error);
    return NextResponse.json(
      { error: 'Failed to export registrations' },
      { status: 500 }
    );
  }
}
