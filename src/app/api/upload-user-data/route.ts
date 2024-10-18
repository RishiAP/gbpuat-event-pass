import { connect } from "@/config/database/mongoDBConfig";
import { getUserFromHeader } from "@/helpers/common_func";
import { College } from "@/models/College";
import { Department } from "@/models/Department";
import { Event } from "@/models/Event";
import { User } from "@/models/User";
import { Verifier } from "@/models/Verifier";
import Dept from "@/types/Department";
import Gate from "@/types/Verifier";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { read, utils } from 'xlsx';
import { headerToObject } from "@/types/extras";

connect();

interface UserEvent {
    seat_no: string | null;
    email: string;
}

export async function POST(req: NextRequest) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const user = await getUserFromHeader(req, true);
        if (user == null) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const form = await req.formData();
        const file = form.get("file") as File | null;
        const event_id = form.get("event_id") as string | null;
        const event = await Event.findById(event_id);

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        } else if (!event_id) {
            return NextResponse.json({ error: "No event ID provided" }, { status: 400 });
        } else if (event == null) {
            return NextResponse.json({ error: "Invalid event ID" }, { status: 400 });
        }

        const allowedTypes = [
            "application/vnd.ms-excel",                
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  
            "application/json",                        
            "text/csv",                                
        ];

        const expHeaders = Object.keys(headerToObject);
        const fileType = file.type;

        if (!allowedTypes.includes(fileType)) {
            return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
        }

        let rows: any[] = [];
        if (fileType === "application/json") {
            const text = await file.text();
            rows = JSON.parse(text);
            if (!Array.isArray(rows)) {
                return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
            }
        } else {
            const buffer = await file.arrayBuffer();
            const workbook = read(buffer, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rows = utils.sheet_to_json(sheet, { header: 1 });
            rows[0] = rows[0].map((header: string) => header.toString().trim().toLowerCase());
            rows[0].forEach((header: string, i: number) => {
                if (!expHeaders.includes(header)) {
                    throw new Error(`Invalid header '${header}' at column ${i + 1}`);
                }
            });
        }

        if (rows.length < 2) {
            return NextResponse.json({ error: "File does not contain enough data" }, { status: 400 });
        }

        const departments = await Department.find();
        const departmentMap = new Map<string, string>();
        departments.forEach((dep: Dept) => {
            departmentMap.set(dep.name.toLowerCase(), dep._id);
        });

        const colleges = await College.find();
        const collegeMap = new Map<string, string>();
        colleges.forEach((col: Dept) => {
            collegeMap.set(col.name.toLowerCase(), col._id);
        });

        const verifiers = await Verifier.find();
        const verifierMap = new Map<string, string>();
        verifiers.forEach((ver: Gate) => {
            verifierMap.set(ver.name.toLowerCase(), ver._id);
        });

        const headers = rows[0];
        const data = rows.slice(1).map((row: any[]) => {
            let rowExist = false;
            row.forEach((r) => (rowExist = rowExist || r != null));
            if (!rowExist) return null;

            const rowData: { [key: string]: any } = {};
            headers.forEach((header: keyof typeof headerToObject, i: number) => {
                rowData[headerToObject[header]] = row[i] || null;

                if ((rowData[headerToObject[header]] == null || rowData[headerToObject[header]] === undefined) && (header === "name" || header === "email id" || header === "aadhar no." || header === "entry gate" || header === "seat no." || header==="photo")) {
                    throw new Error(`Invalid ${header} at row ${rows.indexOf(row) + 1}`);
                }
                if(headerToObject[header] === "seat_no" || headerToObject[header] === "email")
                    rowData[headerToObject[header]] = row[i].toString().trim();

                if (headerToObject[header] === "department" && rowData[headerToObject[header]] != null) {
                    const dept = row[i].toLowerCase().trim().replaceAll("&", "and");
                    if (departmentMap.has(dept) || (!dept.startsWith("department of") && departmentMap.has("department of " + dept))) {
                        rowData[headerToObject[header]] = departmentMap.get(dept) || departmentMap.get("department of " + dept);
                    } else {
                        throw new Error(`Invalid department ${row[i]} at row ${rows.indexOf(row) + 1}`);
                    }
                } else if (headerToObject[header] === "college" && rowData[headerToObject[header]] != null) {
                    const coll = row[i].toLowerCase().trim().replaceAll("&", "and");
                    if (collegeMap.has(coll)) {
                        rowData[headerToObject[header]] = collegeMap.get(coll);
                    } else {
                        throw new Error(`Invalid college '${row[i]}' at row ${rows.indexOf(row) + 1}`);
                    }
                } else if (headerToObject[header] === "verifier") {
                    const verf = row[i].toLowerCase().trim().replaceAll("&", "and");
                    if (verifierMap.has(verf)) {
                        rowData[headerToObject[header]] = verifierMap.get(verf);
                    } else {
                        throw new Error(`Invalid verifier/gate '${row[i]}' at row ${rows.indexOf(row) + 1}`);
                    }
                }
            });
            return rowData;
        }).filter((row) => row != null);

        const newSeatNumbers: UserEvent[] = data.map((user: any) => ({
            seat_no: user.seat_no || null,
            email: user.email
        }));

        // Ensure no `null` seat numbers are passed forward
        if (newSeatNumbers.some(user => user.seat_no == null)) {
            throw new Error("Some users have null seat numbers. Please provide valid seat numbers.");
        }

        const existingUsers = await User.find(
            {
                [`events.${event_id}`]: { $exists: true }
            },
            {
                email: 1,
                events: 1,
            }
        ).lean();

        const existingSeatNumbers: UserEvent[] = existingUsers.flatMap((user: any) => {
            const eventDetails = user.events[event_id];
            return eventDetails ? { seat_no: eventDetails.seat_no, email: user.email } : null;
        }).filter((user: UserEvent | null): user is UserEvent => user?.seat_no != null);

        const allSeatNumbers: UserEvent[] = [...existingSeatNumbers, ...newSeatNumbers];

        const seatToEmailsMap = allSeatNumbers.reduce((acc: Record<string, Set<string>>, { seat_no, email }) => {
            if (!seat_no) return acc;
            if (!acc[seat_no]) {
                acc[seat_no] = new Set();
            }
            acc[seat_no].add(email);
            return acc;
        }, {});

        const duplicates = Object.keys(seatToEmailsMap).filter(seat => seatToEmailsMap[seat].size > 1);

        if (duplicates.length > 0) {
            throw new Error(`Seat numbers : ${duplicates.join(", ")} are tried to be assigned to multiple users.`);
        }

        const no_of_users:number= new Set<string>(allSeatNumbers.map((user: UserEvent) => user.email)).size;

        for (const user of data) {
            await User.findOneAndUpdate(
                { email: user.email },
                {
                    $setOnInsert: { email: user.email, aadhar: user.aadhar },
                    $set: {
                        name: user.name,
                        department: user.department,
                        college: user.college,
                        photo: user.photo,
                        college_id: user.college_id,
                        designation: user.designation,
                        [`events.${event_id}`]: { status: false, seat_no: user.seat_no, enclosure_no: user.enclosure_no, verifier: user.verifier }
                    }
                },
                {
                    session,
                    upsert: true,
                    new: true
                }
            );
        }
        const updatedEvent=await Event.findByIdAndUpdate(event_id, { participants:no_of_users }, { session,new:true });

        await session.commitTransaction();
        return NextResponse.json({ success: true, message: "Users' data recorded successfully.", event:updatedEvent}, { status: 200 });
    } catch (error: any) {
        await session.abortTransaction();
        return NextResponse.json({ error: error.message }, { status: 400 });
    } finally {
        session.endSession();
    }
}
