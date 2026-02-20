import { NextRequest, NextResponse } from 'next/server';
import { User } from '@/models/User';
import { Event } from '@/models/Event';
import { connect } from "@/config/database/mongoDBConfig";
import mongoose from 'mongoose';
import { getUserFromHeader } from '@/helpers/common_func';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connect();
    const admin=await getUserFromHeader(request,true);
    if(admin==null){
        return NextResponse.json({error:"Unauthorized"},{status:401});
    }
    const { eventId } = await params;
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    // Parse query parameters for filtering and pagination
    const searchParams = request.nextUrl.searchParams;
    
    // Pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Filter parameters
  const designation = searchParams.get('designation'); // Student, Faculty, etc.
    const departmentId = searchParams.get('department');
    const collegeId = searchParams.get('college');
  const collegeName = searchParams.get('collegeName');
  const departmentName = searchParams.get('departmentName');
    const hostelId = searchParams.get('hostel');
  const hasCollege = searchParams.get('hasCollege'); // 'true' to require college present
  const noCollegeId = searchParams.get('noCollegeId'); // 'true' to require no college_id
  const hasCollegeId = searchParams.get('hasCollegeId'); // 'true' to require college_id present
    const attendanceStatus = searchParams.get('attendanceStatus'); // attended, not_attended, all
    const hasInvitation = searchParams.get('hasInvitation'); // true, false, all (whether invitation is generated)
    const hasIdCard = searchParams.get('hasIdCard'); // true, false, all (whether id_card is generated)
    const searchQuery = searchParams.get('search'); // Search by name or email
    const entryGate = searchParams.get('entryGate'); // Filter by entry gate
    const enclosureNo = searchParams.get('enclosureNo'); // Filter by enclosure number
    const startDate = searchParams.get('startDate'); // Filter by entry date
    const endDate = searchParams.get('endDate');
    const sortBy = searchParams.get('sortBy') || 'name'; // name, email, entry_time, etc.
    const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;
    
    // Fields to include in response (comma-separated)
    // Example: fields=invitation,id_card,photo or leave empty for all fields
    const fieldsParam = searchParams.get('fields');
    const requestedFields = fieldsParam ? fieldsParam.split(',').map(f => f.trim()) : null;
  // Whether to include trends data in this response. Default: include trends.
  const includeTrends = searchParams.get('includeTrends'); // 'false' to skip computing trends
    
    // Build the base match query
    const baseMatch: any = {
      [`events.${eventId}`]: { $exists: true }
    };

    // Apply basic filters
    if (designation && designation !== 'all') {
      baseMatch.designation = designation;
    }
    
    // We'll handle department filtering after lookup to be robust against types
    let departmentMatchClauses: any[] = [];
    if (departmentId && departmentId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(departmentId)) {
        departmentMatchClauses.push({ 'departmentInfo._id': new mongoose.Types.ObjectId(departmentId) });
        departmentMatchClauses.push({ department: new mongoose.Types.ObjectId(departmentId) });
      } else {
        // Fallback: try matching as string (rare)
        departmentMatchClauses.push({ department: departmentId });
      }
      // If a department name was provided, also match by resolved name
      if (departmentName) {
        departmentMatchClauses.push({ 'departmentInfo.name': departmentName });
      }
    }
    
    // We'll handle college filtering after lookups so we can match by collegeInfo or numeric college_id.
    let collegeMatchClauses: any[] = [];
    if (collegeId && collegeId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(collegeId)) {
        collegeMatchClauses.push({ 'collegeInfo._id': new mongoose.Types.ObjectId(collegeId) });
        // also allow matching the raw college field if present on user
        collegeMatchClauses.push({ college: new mongoose.Types.ObjectId(collegeId) });
      }
      const numeric = Number(collegeId);
      if (!isNaN(numeric)) {
        collegeMatchClauses.push({ college_id: numeric });
      }
      // If a college name was provided, also match by resolved college name
      if (collegeName) {
        collegeMatchClauses.push({ 'collegeInfo.name': collegeName });
      }
    }
    
    if (hostelId && hostelId !== 'all') {
      baseMatch.hostel = new mongoose.Types.ObjectId(hostelId);
    }

    // Faculty/Hostel classification filters
    if (hasCollege === 'true') {
      baseMatch.college = { $exists: true, $ne: null };
    }
    if (noCollegeId === 'true') {
      // Ensure college_id is not present or null
      baseMatch.$and = (baseMatch.$and || []).concat([
        { $or: [ { college_id: { $exists: false } }, { college_id: null } ] }
      ]);
    }
    if (hasCollegeId === 'true') {
      baseMatch.$and = (baseMatch.$and || []).concat([
        { college_id: { $exists: true, $ne: null } }
      ]);
    }
    
    // Search filter
    if (searchQuery) {
      baseMatch.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: baseMatch },
      
      // Add event data as a field for easier filtering
      {
        $addFields: {
          eventData: { $objectToArray: '$events' }
        }
      },
      {
        $unwind: '$eventData'
      },
      {
        $match: {
          'eventData.k': eventId
        }
      },
      
      // Lookup related data
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'departmentInfo'
        }
      },
      {
        $lookup: {
          from: 'colleges',
          localField: 'college',
          foreignField: '_id',
          as: 'collegeInfo'
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
        $lookup: {
          from: 'verifiers',
          localField: 'eventData.v.verifier',
          foreignField: '_id',
          as: 'verifierInfo'
        }
      },
      
      // Unwind lookups
      {
        $unwind: {
          path: '$departmentInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$collegeInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$hostelInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$verifierInfo',
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    // Only add $match for college/department if the filter is not 'all' and clauses are present
    const filterAndClauses: any[] = [];
    if (collegeId && collegeId !== 'all' && collegeMatchClauses.length > 0) {
      filterAndClauses.push({ $or: collegeMatchClauses });
    }
    if (departmentId && departmentId !== 'all' && departmentMatchClauses.length > 0) {
      filterAndClauses.push({ $or: departmentMatchClauses });
    }
    if (filterAndClauses.length === 1) {
      pipeline.push({ $match: filterAndClauses[0] });
    } else if (filterAndClauses.length > 1) {
      pipeline.push({ $match: { $and: filterAndClauses } });
    }

    // Apply event-specific filters
    const eventFilters: any[] = [];
    
    // Invitation generated filter
    if (hasInvitation === 'true') {
      eventFilters.push({
        'eventData.v.invitation': { $ne: null, $exists: true }
      });
    } else if (hasInvitation === 'false') {
      eventFilters.push({
        $or: [
          { 'eventData.v.invitation': null },
          { 'eventData.v.invitation': { $exists: false } }
        ]
      });
    }
    
    // ID card generated filter
    if (hasIdCard === 'true') {
      eventFilters.push({
        'eventData.v.id_card': { $ne: null, $exists: true }
      });
    } else if (hasIdCard === 'false') {
      eventFilters.push({
        $or: [
          { 'eventData.v.id_card': null },
          { 'eventData.v.id_card': { $exists: false } }
        ]
      });
    }
    
    // Attendance status filter (has entry_time or not)
    if (attendanceStatus === 'attended') {
      eventFilters.push({
        'eventData.v.entry_time': { $ne: null, $exists: true }
      });
    } else if (attendanceStatus === 'not_attended') {
      eventFilters.push({
        $or: [
          { 'eventData.v.entry_time': null },
          { 'eventData.v.entry_time': { $exists: false } }
        ]
      });
    }
    
    // Entry gate filter
    if (entryGate && entryGate !== 'all') {
      eventFilters.push({
        'eventData.v.entry_gate': entryGate
      });
    }
    
    // Enclosure number filter
    if (enclosureNo && enclosureNo !== 'all') {
      eventFilters.push({
        'eventData.v.enclosure_no': enclosureNo
      });
    }
    
    // Date range filter for entry time
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate);
      }
      eventFilters.push({
        'eventData.v.entry_time': dateFilter
      });
    }
    
    // Apply all event filters using $and to combine them
    if (eventFilters.length > 0) {
      pipeline.push({ 
        $match: eventFilters.length === 1 ? eventFilters[0] : { $and: eventFilters }
      });
    }

    // Project the final structure
    const projectStage: any = {
      _id: 1,
      email: 1,
      name: 1,
      aadhaar: 1,
      college_id: 1,
      designation: 1,
      photo: 1,
      locked: 1,
      createdAt: 1,
      updatedAt: 1,
      department: {
        _id: '$departmentInfo._id',
        name: '$departmentInfo.name'
      },
      college: {
        _id: '$collegeInfo._id',
        // If collegeInfo is missing (hostel users with numeric college_id), fall back to stringified college_id
        name: { $ifNull: ['$collegeInfo.name', { $toString: '$college_id' }] }
      },
      hostel: {
        _id: '$hostelInfo._id',
        name: '$hostelInfo.name'
      },
      eventInfo: {
        status: '$eventData.v.status',
        seat_no: '$eventData.v.seat_no',
        enclosure_no: '$eventData.v.enclosure_no',
        entry_gate: '$eventData.v.entry_gate',
        entry_time: '$eventData.v.entry_time',
        invitation: '$eventData.v.invitation',
        id_card: '$eventData.v.id_card',
        emails_sent: '$eventData.v.emails_sent',
        verifier: {
          _id: '$verifierInfo._id',
          name: '$verifierInfo.name',
          email: '$verifierInfo.email'
        },
        // Helper flags for frontend
        hasInvitation: {
          $cond: [
            { $and: [
              { $ne: ['$eventData.v.invitation', null] },
              { $ne: ['$eventData.v.invitation', ''] }
            ]},
            true,
            false
          ]
        },
        hasIdCard: {
          $cond: [
            { $and: [
              { $ne: ['$eventData.v.id_card', null] },
              { $ne: ['$eventData.v.id_card', ''] }
            ]},
            true,
            false
          ]
        },
        hasAttended: {
          $cond: [
            { $ne: ['$eventData.v.entry_time', null] },
            true,
            false
          ]
        }
      }
    };

    // If specific fields are requested, filter the eventInfo
    if (requestedFields && requestedFields.length > 0) {
      const allowedEventFields = ['status', 'seat_no', 'enclosure_no', 'entry_gate', 'entry_time', 
                                   'invitation', 'id_card', 'emails_sent', 'verifier', 
                                   'hasInvitation', 'hasIdCard', 'hasAttended'];
      
      // Build filtered eventInfo based on requested fields
      const filteredEventInfo: any = {};
      allowedEventFields.forEach(field => {
        if (requestedFields.includes(field) || 
            field.startsWith('has') || // Always include helper flags
            field === 'status') { // Always include status
          filteredEventInfo[field] = projectStage.eventInfo[field];
        }
      });
      
      projectStage.eventInfo = filteredEventInfo;
    }

    pipeline.push({ $project: projectStage });

    // Add sorting
    const sortField = sortBy === 'entry_time' ? 'eventInfo.entry_time' : sortBy;
    pipeline.push({ $sort: { [sortField]: sortOrder } });

    // Get total count before pagination
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    const countResult = await User.aggregate(countPipeline);
    const totalCount = countResult.length > 0 ? countResult[0].total : 0;

    // Apply pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute the aggregation
    const users = await User.aggregate(pipeline);

    // Calculate summary statistics efficiently using aggregation (10-100x faster than loading all users)
    const summaryPipeline = [
      { $match: { [`events.${eventId}`]: { $exists: true } } },
      {
        $addFields: {
          eventData: { $objectToArray: '$events' }
        }
      },
      { $unwind: '$eventData' },
      { $match: { 'eventData.k': eventId } },
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          withInvitation: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$eventData.v.invitation', null] },
                  { $ne: ['$eventData.v.invitation', ''] }
                ]},
                1,
                0
              ]
            }
          },
          withIdCard: {
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ['$eventData.v.id_card', null] },
                  { $ne: ['$eventData.v.id_card', ''] }
                ]},
                1,
                0
              ]
            }
          },
          attendedCount: {
            $sum: {
              $cond: [
                { $ne: ['$eventData.v.entry_time', null] },
                1,
                0
              ]
            }
          }
        }
      }
    ];

    const summaryResult = await User.aggregate(summaryPipeline);
    const stats = summaryResult[0] || {
      totalRegistrations: 0,
      withInvitation: 0,
      withIdCard: 0,
      attendedCount: 0
    };

    const totalRegistrations = stats.totalRegistrations;
    const withInvitation = stats.withInvitation;
    const withIdCard = stats.withIdCard;
    const attendedCount = stats.attendedCount;

    const attendancePercentage = totalRegistrations > 0 
      ? Math.round((attendedCount / totalRegistrations) * 100) 
      : 0;
    
    const invitationPercentage = totalRegistrations > 0 
      ? Math.round((withInvitation / totalRegistrations) * 100) 
      : 0;
    
    const idCardPercentage = totalRegistrations > 0 
      ? Math.round((withIdCard / totalRegistrations) * 100) 
      : 0;


    // Determine if this is a faculty or hostel query by filters
    const isFaculty = searchParams.get('hasCollege') === 'true' && searchParams.get('noCollegeId') === 'true';
    const isHostel = searchParams.get('hasCollegeId') === 'true';

  let registrationTrends: any[] = [];
  let attendanceTrends: any[] = [];

    if (includeTrends !== 'false') {
    if (isFaculty) {
      // Faculty: group by college only
      const trends = await User.aggregate([
        { $match: { [`events.${eventId}`]: { $exists: true }, college: { $exists: true, $ne: null }, college_id: { $exists: false } } },
        { $lookup: { from: 'colleges', localField: 'college', foreignField: '_id', as: 'collegeInfo' } },
        { $unwind: { path: '$collegeInfo', preserveNullAndEmptyArrays: true } },
        { $group: {
            _id: { $ifNull: ['$collegeInfo.name', 'Unknown College'] },
            registrations: { $sum: 1 },
            attended: { $sum: { $cond: [ { $ifNull: [`$events.${eventId}.entry_time`, false] }, 1, 0 ] } }
        } },
        { $project: { name: '$_id', registrations: 1, attended: 1, _id: 0 } },
        { $sort: { registrations: -1 } }
      ]);
      registrationTrends = trends.map(trend => ({ name: trend.name, value: trend.registrations }));
      attendanceTrends = trends.map(trend => ({ name: trend.name, value: trend.attended }));
  } else if (isHostel) {
      // Hostel: group by hostel only
      const trends = await User.aggregate([
        { $match: { [`events.${eventId}`]: { $exists: true }, college_id: { $exists: true, $ne: null } } },
        { $lookup: { from: 'hostels', localField: 'hostel', foreignField: '_id', as: 'hostelInfo' } },
        { $unwind: { path: '$hostelInfo', preserveNullAndEmptyArrays: true } },
        { $group: {
            _id: { $ifNull: ['$hostelInfo.name', 'Unknown Hostel'] },
            registrations: { $sum: 1 },
            attended: { $sum: { $cond: [ { $ifNull: [`$events.${eventId}.entry_time`, false] }, 1, 0 ] } }
        } },
        { $project: { name: '$_id', registrations: 1, attended: 1, _id: 0 } },
        { $sort: { registrations: -1 } }
      ]);
      registrationTrends = trends.map(trend => ({ name: trend.name, value: trend.registrations }));
      attendanceTrends = trends.map(trend => ({ name: trend.name, value: trend.attended }));
  }
  } // end includeTrends check

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      // Summary statistics
      summary: {
        totalRegistrations,
        withInvitation,
        withIdCard,
        attendedCount,
        attendancePercentage,
        invitationPercentage,
        idCardPercentage,
        registrationTrends,
        attendanceTrends
      },
      // Filtered and paginated data
      data: users,
      // Pagination metadata
      pagination: {
        currentPage: page,
        limit,
        totalCount,
        totalPages,
        hasMore
      },
      // Applied filters (for UI state)
      filters: {
        designation,
        departmentId,
        collegeId,
        hostelId,
        hasInvitation,
        hasIdCard,
        attendanceStatus,
        searchQuery,
        entryGate,
        enclosureNo,
        startDate,
        endDate,
        sortBy,
        sortOrder: sortOrder === 1 ? 'asc' : 'desc',
        fields: requestedFields
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
