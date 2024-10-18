export default interface User{
    email: string;
    name: string;
    aadhar: string;
    college_id: number|null;
    designation: string|null;
    department: string|null;
    college: string|null;
    photo: string|null;
    events: Map<string, { status: boolean; seat_no: string|null; enclosure_no:string|null; verifier: string }>;  // Verifier as ObjectId
}