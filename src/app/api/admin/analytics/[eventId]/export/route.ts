
import { NextRequest, NextResponse } from 'next/server';
import { connect } from "@/config/database/mongoDBConfig";
import mongoose from 'mongoose';
import { Parser } from 'json2csv';
import { User } from '@/models/User';
import { College } from '@/models/College';
import { Department } from '@/models/Department';
import { Hostel } from '@/models/Hostel';
import { Verifier } from '@/models/Verifier';
import { getUserFromHeader } from '@/helpers/common_func';

College;
Department;
Hostel;
Verifier;

// Map of available exportable fields and their labels
const EXPORT_FIELDS: Record<string, { label: string; value: (row: any) => any }> = {
  name: { label: 'Name', value: (u) => u.name || '' },
  email: { label: 'Email', value: (u) => u.email || '' },
  aadhar: { label: 'Aadhar', value: (u) => u.aadhar || '' },
  college_id: { label: 'College ID', value: (u) => u.college_id || '' },
  designation: { label: 'Designation', value: (u) => u.designation || '' },
  department: { label: 'Department', value: (u) => u.department?.name || '' },
  college: { label: 'College', value: (u) => u.college?.name || '' },
  hostel: { label: 'Hostel', value: (u) => u.hostel?.name || '' },
  seat_no: { label: 'Seat No', value: (u) => u.eventData?.seat_no || '' },
  enclosure_no: { label: 'Enclosure No', value: (u) => u.eventData?.enclosure_no || '' },
  entry_gate: { label: 'Entry Gate', value: (u) => u.eventData?.entry_gate || '' },
  entry_time: { label: 'Entry Time', value: (u) => u.eventData?.entry_time ? new Date(u.eventData.entry_time).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '' },
  status: { label: 'Status', value: (u) => u.eventData?.status ? 'Attended' : 'Not Attended' },
  createdAt: { label: 'Created At', value: (u) => u.createdAt ? new Date(u.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '' },
  invitation: { label: 'Invitation', value: (u) => u.eventData?.invitation || '' },
  id_card: { label: 'ID Card', value: (u) => u.eventData?.id_card || '' },
  verifier: { label: 'Verifier', value: (u) => u.eventData?.verifier?.name || '' },
};

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
    const searchParams = request.nextUrl.searchParams;

    // Get selected columns from query param (comma-separated)
    const fieldsParam = searchParams.get('fields');
    // If not provided, export all available fields
    const selectedFields = fieldsParam ? fieldsParam.split(',').map(f => f.trim()).filter(f => EXPORT_FIELDS[f]) : Object.keys(EXPORT_FIELDS);
    if (selectedFields.length === 0) {
      return NextResponse.json({ error: 'No valid columns selected for export' }, { status: 400 });
    }

    // Build filters (mirror analytics route logic)
    const baseMatch: any = {
      [`events.${eventId}`]: { $exists: true }
    };

    // Filters
    const designation = searchParams.get('designation');
    const departmentId = searchParams.get('department');
    const collegeId = searchParams.get('college');
    const collegeName = searchParams.get('collegeName');
    const departmentName = searchParams.get('departmentName');
    const hostelId = searchParams.get('hostel');
    const hasCollege = searchParams.get('hasCollege');
    const noCollegeId = searchParams.get('noCollegeId');
    const hasCollegeId = searchParams.get('hasCollegeId');
    const attendanceStatus = searchParams.get('attendanceStatus');
    const hasInvitation = searchParams.get('hasInvitation');
    const hasIdCard = searchParams.get('hasIdCard');
    const searchQuery = searchParams.get('search');
    const entryGate = searchParams.get('entryGate');
    const enclosureNo = searchParams.get('enclosureNo');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Apply basic filters
    if (designation && designation !== 'all') {
      baseMatch.designation = designation;
    }
    let departmentMatchClauses: any[] = [];
    if (departmentId && departmentId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(departmentId)) {
        departmentMatchClauses.push({ 'departmentInfo._id': new mongoose.Types.ObjectId(departmentId) });
      }
      if (departmentName) {
        departmentMatchClauses.push({ 'departmentInfo.name': departmentName });
      }
    }
    let collegeMatchClauses: any[] = [];
    if (collegeId && collegeId !== 'all') {
      if (mongoose.Types.ObjectId.isValid(collegeId)) {
        collegeMatchClauses.push({ 'collegeInfo._id': new mongoose.Types.ObjectId(collegeId) });
      }
      const numeric = Number(collegeId);
      if (!isNaN(numeric)) {
        collegeMatchClauses.push({ college_id: numeric });
      }
      if (collegeName) {
        collegeMatchClauses.push({ 'collegeInfo.name': collegeName });
      }
    }
    if (hostelId && hostelId !== 'all') {
      baseMatch.hostel = new mongoose.Types.ObjectId(hostelId);
    }
    if (hasCollege === 'true') {
      baseMatch.college = { $exists: true, $ne: null };
    }
    if (noCollegeId === 'true') {
      baseMatch.$and = (baseMatch.$and || []).concat([
        { $or: [ { college_id: { $exists: false } }, { college_id: null } ] }
      ]);
    }
    if (hasCollegeId === 'true') {
      baseMatch.$and = (baseMatch.$and || []).concat([
        { college_id: { $exists: true, $ne: null } }
      ]);
    }
    if (searchQuery) {
      baseMatch.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Determine which related lookups are truly needed based on selected fields or filters
    const needDepartment = selectedFields.includes('department') || (departmentId && departmentId !== 'all') || !!departmentName;
    const needCollege = selectedFields.includes('college') || selectedFields.includes('college_id') || (collegeId && collegeId !== 'all') || !!collegeName;
    const needHostel = selectedFields.includes('hostel') || (hostelId && hostelId !== 'all');
    const needVerifier = selectedFields.includes('verifier') || selectedFields.includes('entry_gate') || selectedFields.includes('enclosure_no'); // verifier needed only if exporting it

    // Optimised aggregation pipeline:
    //  - Use $getField to pull the event subdocument directly (avoids $objectToArray + $unwind)
    //  - Add lookups only when required
    //  - Project only requested fields + those required for filters / derivations
    const pipeline: any[] = [
      { $match: baseMatch },
      { $set: { eventData: { $getField: { field: eventId, input: '$events' } } } },
      { $match: { eventData: { $exists: true } } },
    ];

    if (needDepartment) {
      pipeline.push({ $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'departmentInfo' } });
      pipeline.push({ $unwind: { path: '$departmentInfo', preserveNullAndEmptyArrays: true } });
    }
    if (needCollege) {
      pipeline.push({ $lookup: { from: 'colleges', localField: 'college', foreignField: '_id', as: 'collegeInfo' } });
      pipeline.push({ $unwind: { path: '$collegeInfo', preserveNullAndEmptyArrays: true } });
    }
    if (needHostel) {
      pipeline.push({ $lookup: { from: 'hostels', localField: 'hostel', foreignField: '_id', as: 'hostelInfo' } });
      pipeline.push({ $unwind: { path: '$hostelInfo', preserveNullAndEmptyArrays: true } });
    }
    if (needVerifier) {
      pipeline.push({ $lookup: { from: 'verifiers', localField: 'eventData.verifier', foreignField: '_id', as: 'verifierInfo' } });
      pipeline.push({ $unwind: { path: '$verifierInfo', preserveNullAndEmptyArrays: true } });
      pipeline.push({ $set: { 'eventData.verifier': '$verifierInfo' } });
    }
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
    // Event-specific filters
    const eventFilters: any[] = [];
    if (hasInvitation === 'true') {
      eventFilters.push({ 'eventData.invitation': { $ne: null, $exists: true } });
    } else if (hasInvitation === 'false') {
      eventFilters.push({ $or: [ { 'eventData.invitation': null }, { 'eventData.invitation': { $exists: false } } ] });
    }
    if (hasIdCard === 'true') {
      eventFilters.push({ 'eventData.id_card': { $ne: null, $exists: true } });
    } else if (hasIdCard === 'false') {
      eventFilters.push({ $or: [ { 'eventData.id_card': null }, { 'eventData.id_card': { $exists: false } } ] });
    }
    if (attendanceStatus === 'attended') {
      eventFilters.push({ 'eventData.entry_time': { $ne: null, $exists: true } });
    } else if (attendanceStatus === 'not_attended') {
      eventFilters.push({ $or: [ { 'eventData.entry_time': null }, { 'eventData.entry_time': { $exists: false } } ] });
    }
    if (entryGate && entryGate !== 'all') {
      eventFilters.push({ 'eventData.entry_gate': entryGate });
    }
    if (enclosureNo && enclosureNo !== 'all') {
      eventFilters.push({ 'eventData.enclosure_no': enclosureNo });
    }
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.$gte = new Date(startDate);
      if (endDate) dateFilter.$lte = new Date(endDate);
      if (Object.keys(dateFilter).length > 0) {
        eventFilters.push({ 'eventData.entry_time': dateFilter });
      }
    }
    if (eventFilters.length > 0) {
      pipeline.push({ $match: { $and: eventFilters } });
    }

    // No pagination for export: get all rows

    // Build dynamic projection only for requested columns & fields needed for formatting.
    const projectStage: any = { };
    // Base scalar fields
    if (selectedFields.some(f => ['name','email','aadhar','college_id','designation','createdAt'].includes(f))) {
      if (selectedFields.includes('name')) projectStage.name = 1;
      if (selectedFields.includes('email')) projectStage.email = 1;
      if (selectedFields.includes('aadhar')) projectStage.aadhar = 1;
      if (selectedFields.includes('college_id')) projectStage.college_id = 1;
      if (selectedFields.includes('designation')) projectStage.designation = 1;
      if (selectedFields.includes('createdAt')) projectStage.createdAt = 1;
    }
    if (needDepartment) {
      projectStage.department = { _id: '$departmentInfo._id', name: '$departmentInfo.name' };
    }
    if (needCollege) {
      projectStage.college = { _id: '$collegeInfo._id', name: { $ifNull: ['$collegeInfo.name', { $toString: '$college_id' }] } };
      // if only college_id requested (without college) we still need raw field
      if (!selectedFields.includes('college') && selectedFields.includes('college_id')) {
        projectStage.college_id = 1;
      }
    }
    if (needHostel) {
      projectStage.hostel = { _id: '$hostelInfo._id', name: '$hostelInfo.name' };
    }
    // eventData container collects any requested event subfields
    const eventSub: any = {};
    const eventFieldMap: Record<string,string> = {
      seat_no: 'seat_no',
      enclosure_no: 'enclosure_no',
      entry_gate: 'entry_gate',
      entry_time: 'entry_time',
      invitation: 'invitation',
      id_card: 'id_card',
      status: 'status'
    };
    Object.entries(eventFieldMap).forEach(([k,v]) => { if (selectedFields.includes(k)) eventSub[v] = `$eventData.${v}`; });
    if (needVerifier && selectedFields.includes('verifier')) {
      eventSub.verifier = {
        _id: '$eventData.verifier._id',
        name: '$eventData.verifier.name',
        email: '$eventData.verifier.email'
      };
    }
    if (Object.keys(eventSub).length > 0) {
      projectStage.eventData = eventSub;
    }
    // Ensure at least one field (MongoDB requires projection not empty) fallback
    if (Object.keys(projectStage).length === 0) {
      projectStage._id = 0; // return minimal doc; formatting loop will handle empties
    }
    pipeline.push({ $project: projectStage });

    // Sort by name by default
    pipeline.push({ $sort: { name: 1 } });

    // Execute aggregation
    const registrations = await User.aggregate(pipeline);

    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ error: 'No registrations found for this event' }, { status: 404 });
    }

    // Format data for CSV - only selected columns
    const formattedData = registrations.map((user: any) => {
      const row: Record<string, any> = {};
      for (const field of selectedFields) {
        row[field] = EXPORT_FIELDS[field].value(user);
      }
      return row;
    });

    // Define CSV fields for json2csv
    const fields = selectedFields.map((field) => ({ label: EXPORT_FIELDS[field].label, value: field }));
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
