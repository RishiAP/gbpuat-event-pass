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
import { Hostel } from "@/models/Hostel";

connect();

interface UserEvent {
    seat_no: string | null;
    email: string;
}

export async function POST(req: NextRequest) {
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
        const eventVerifiers:Map<string,number>=new Map<string,number>();

        const hostels=await Hostel.find();
        const hostelMap=new Map<string,string>();
        hostels.forEach((hostel)=>{
            hostelMap.set(hostel.name.toLowerCase(),hostel._id);
        });

        const headers = rows[0];
        const data = rows.slice(1).map((row: any[]) => {
            let rowExist = false;
            row.forEach((r) => (rowExist = rowExist || r != null));
            if (!rowExist) return null;

            const rowData: { [key: string]: any } = {};
            headers.forEach((header: keyof typeof headerToObject, i: number) => {
                rowData[headerToObject[header]] = row[i] || null;

                if ((rowData[headerToObject[header]] == null || rowData[headerToObject[header]] === undefined) && (header === "name" || header === "email id" || header === "aadhar no." || header === "main gate" || header==="enclosure no.")) {
                    return null;
                }
                if(headerToObject[header] === "seat_no" || headerToObject[header] === "email" || headerToObject[header] === "enclosure_no")
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
                        return null;
                    }
                }else if (headerToObject[header]=="hostel" && rowData[headerToObject[header]]!=null){
                    const hostel=row[i].toLowerCase().trim().replaceAll("&","and");
                    if(hostelMap.has(hostel)){
                        rowData[headerToObject[header]]=hostelMap.get(hostel);
                    }else{
                        throw new Error(`Invalid hostel '${row[i]}' at row ${rows.indexOf(row) + 1}`);
                    }
                }
            });
            return rowData;
        }).filter((row) => row != null);

        const uniqueEmails = new Set<string>();

        for (const user of data) {
            uniqueEmails.add(user.email);
            eventVerifiers.set(user.verifier, (eventVerifiers.get(user.verifier)||0)+1);
            await User.findOneAndUpdate(
                { email: user.email },
                {
                    $setOnInsert: { email: user.email,[`events.${event_id}.emails_sent`]:[] },
                    $set: {...{
                        name: user.name,
                        hostel: user.hostel,
                        department: user.department,
                        college: user.college,
                        photo: user.photo,
                        aadhar: user.aadhar,
                        designation: user.designation,
                        [`events.${event_id}.status`]: false,
                        [`events.${event_id}.seat_no`]: user.seat_no,
                        [`events.${event_id}.enclosure_no`]: user.enclosure_no,
                        [`events.${event_id}.verifier`]: user.verifier
                    },
                    ...(user.college_id!=null && typeof user.college_id=="number"?{
                        college_id: user.college_id
                    }:{})
                }
                },
                {
                    upsert: true,
                    new: true
                }
            );
        }
        const updatedEvent=await Event.findByIdAndUpdate(event_id, { participants:uniqueEmails.size,
            verifiers: Array.from(eventVerifiers.entries()).map(([key,value])=>({verifier:key,no_of_users:value}))
        }, { new:true });

        return NextResponse.json({ success: true, message: "Users' data recorded successfully.", event:updatedEvent}, { status: 200 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
