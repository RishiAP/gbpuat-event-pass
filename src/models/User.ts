import mongoose, { Schema, Document } from "mongoose";

// IUser Interface Definition
export interface IUser extends Document {
    email: string;
    name: string;
    aadhar: string;
    college_id: number|null;
    designation: string|null;
    department: Schema.Types.ObjectId|null;
    college: Schema.Types.ObjectId|null;
    hostel: Schema.Types.ObjectId|null|string;
    photo: string|null;
    locked: boolean;
    events: Map<Schema.Types.ObjectId, { status: boolean; seat_no:string; enclosure_no: string; emails_sent:String[], entry_gate:string, entry_time:Date, verifier: Schema.Types.ObjectId, invitation:String }>;  // Verifier as ObjectId
}

// User Schema Definition
const UserSchema = new Schema<IUser>({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    name: {
        type: String,
        required: true,
    },
    aadhar: {
        type: String,
        required: true,
    },
    college_id: {
        type: Number,
        required: false
    },
    designation: {
        type: String,
        required: false,
        default: "Student",
    },
    department: {
        type: Schema.Types.ObjectId,
        ref: 'Department',
        required: false,
        default: null,
    },
    college: {
        type: Schema.Types.ObjectId,
        ref: 'College',
        required: false,
        default: null,
    },
    hostel: {
        type: Schema.Types.ObjectId,
        ref: 'Hostel',
        required: false,
        default: null,
    },
    photo: {
        type: String,
        required: true
    },
    locked: {
        type: Boolean,
        required: true,
        default: false,
    },
    events: {
        type: Map,
        of: new Schema({
            status: {
                type: Boolean,  // Event participation status
                required: true,
                default: false,  // Default status is false (not participating)
            },
            seat_no: {
                type: String,
                required: true,
            },
            emails_sent:{
                type: [String],
                required: true,
                default: [],
            },
            entry_time: {
                type: Date,
                required: false,
                default: null,
            },
            entry_gate: {
                type: String,
                required: false,
                default: null,
            },
            enclosure_no: {
                type: String,
                required: true,
            },
            verifier: {
                type: Schema.Types.ObjectId,  // Reference to Verifier model (as ObjectId)
                ref: 'Verifier',  // Specify that verifier refers to the Verifier model
                required: true,  // Verifier cannot be null
            },
            invitation: {
                type: String,
                required: false,
                default: null,
            }
        }),
        default: {},
    }
}, { timestamps: true });

UserSchema.index({ college_id: 1 }, { unique: true, partialFilterExpression: { college_id: { $ne: null } } });

// Export User Model
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);