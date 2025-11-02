import Verifier from "./Verifier";

export default interface Event {
    title: string;
    description: string;
    date: Date;
    location: string;
    status: string;
    attended: number;
    participants: number;
    _id:string;
    createdAt:Date;
    updatedAt:Date;
    emails_sent: number;
    verifiers: {verifier:Verifier,attended:number,no_of_users:number}[];
    invitations_generated: number;
}