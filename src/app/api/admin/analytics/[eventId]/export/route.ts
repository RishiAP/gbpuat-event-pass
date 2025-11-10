import { NextResponse } from 'next/server';
import { connect } from "@/config/database/mongoDBConfig";
import mongoose from 'mongoose';
import { Parser } from 'json2csv';
import {User} from '@/models/User';
import { College } from '@/models/College';
import { Department } from '@/models/Department';
import { Hostel } from '@/models/Hostel';
import { Verifier } from '@/models/Verifier';

College;
Department;
Hostel;
Verifier;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connect();
    const { eventId } = await params;

    // Get all registrations for the event
    const registrations = await User.find({ [`events.${eventId}`]: { $exists: true } })
      .populate("college")
      .populate("department")
      .populate("hostel")
      .lean();

    if (registrations.length === 0) {
      return NextResponse.json(
        { error: 'No registrations found for this event' },
        { status: 404 }
      );
    }

    // Format data for CSV - extract event-specific data from the events Map
    const formattedData = registrations.map((user: any) => {
      const eventData = user.events[eventId] || {};
      
      return {
        name: user.name || '',
        email: user.email || '',
        aadhar: user.aadhar || '',
        college_id: user.college_id || '',
        designation: user.designation || '',
        department: user.department?.name || '',
        college: user.college?.name || '',
        hostel: user.hostel?.name || '',
        seat_no: eventData.seat_no || '',
        enclosure_no: eventData.enclosure_no || '',
        entry_gate: eventData.entry_gate || '',
        entry_time: eventData.entry_time ? new Date(eventData.entry_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
        status: eventData.status ? 'Attended' : 'Not Attended',
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '',
      };
    });

    // Define CSV fields
    const fields = [
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Aadhar', value: 'aadhar' },
      { label: 'College ID', value: 'college_id' },
      { label: 'Designation', value: 'designation' },
      { label: 'Department', value: 'department' },
      { label: 'College', value: 'college' },
      { label: 'Hostel', value: 'hostel' },
      { label: 'Seat No', value: 'seat_no' },
      { label: 'Enclosure No', value: 'enclosure_no' },
      { label: 'Entry Gate', value: 'entry_gate' },
      { label: 'Entry Time', value: 'entry_time' },
      { label: 'Status', value: 'status' },
      { label: 'Created At', value: 'createdAt' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedData);

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
