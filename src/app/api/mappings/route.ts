import { NextRequest, NextResponse } from 'next/server';

import { connect } from '@/config/database/mongoDBConfig';
import { College } from '@/models/College';
import { Hostel } from '@/models/Hostel';
import { Department } from '@/models/Department';

export async function GET(req: NextRequest) {
  await connect();
  const [colleges, hostels, departments] = await Promise.all([
    College.find({}, { _id: 1, name: 1 }).lean(),
    Hostel.find({}, { _id: 1, name: 1 }).lean(),
    Department.find({}, { _id: 1, name: 1, college: 1 }).lean(),
  ]);
  return NextResponse.json({
    colleges,
    hostels,
    departments,
  });
}
