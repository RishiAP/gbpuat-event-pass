import Department from "@/types/Department";
import College from "@/types/College";

export default interface User{
    _id: string;
    email: string;
    name: string;
    aadhar: string;
    college_id: number|null;
    designation: string|null;
    department: Department|null;
    college: College|null;
    photo: string|null;
    repeated: boolean;
    same_gate: boolean;
    hostel:{name:string}|null;
    events: {[key:string]: { status: boolean; seat_no: string|null; enclosure_no:string|null; verifier: {name:string}, invitation:string; entry_gate:string|null; entry_time:null|Date };};  // Verifier as ObjectId
}