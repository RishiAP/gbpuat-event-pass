import { NextResponse } from 'next/server';
import { User } from '@/models/User';
import { connect } from "@/config/database/mongoDBConfig";
import mongoose from 'mongoose';

export async function GET(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  try {
    await connect();
    const { eventId } = params;
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Get all users registered for the event
    const users = await User.find({ [`events.${eventId}`]: { $exists: true } });
    
    // Calculate metrics
    const totalRegistrations = users.length;
    let verifiedCount = 0;
    let attendedCount = 0;
    
    users.forEach(user => {
      const eventData = user.events.get(eventId);
      if (eventData) {
        // Consider verified if they have an invitation
        if (eventData.invitation) verifiedCount++;
        // Consider attended if they have an entry time
        if (eventData.entry_time) attendedCount++;
      }
    });

    // Calculate attendance percentage
    const attendancePercentage = totalRegistrations > 0 
      ? Math.round((attendedCount / totalRegistrations) * 100) 
      : 0;

    // Get registrations and attendance grouped by hostel
    const trends = await User.aggregate([
      {
        $match: {
          [`events.${eventId}`]: { $exists: true }
        }
      },
      {
        $lookup: {
          from: 'hostels',
          localField: 'hostel',
          foreignField: '_id',
          as: 'hostelInfo'
        }
      },
      { 
        $unwind: {
          path: '$hostelInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$hostelInfo.name', 'Not Specified']
          },
          registrations: { $sum: 1 },
          attended: {
            $sum: {
              $cond: [
                { $ifNull: [`$events.${eventId}.entry_time`, false] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          name: '$_id',
          registrations: 1,
          attended: 1,
          _id: 0
        }
      },
      { $sort: { registrations: -1 } }
    ]);

    // Format data for charts
    const registrationTrends = trends.map(trend => ({
      name: trend.name,
      value: trend.registrations
    }));

    const attendanceTrends = trends.map(trend => ({
      name: trend.name,
      value: trend.attended
    }));
    return NextResponse.json({
      totalRegistrations,
      verifiedCount,
      attendedCount,
      attendancePercentage,
      registrationTrends,
      attendanceTrends
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
