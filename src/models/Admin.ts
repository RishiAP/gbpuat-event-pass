import mongoose, { Document, Schema } from "mongoose";

export interface IAdmin extends Document {
    username: string;
    password: string;
    email: string;
    sessionToken: string;
}

const AdminSchema = new Schema<IAdmin>({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    sessionToken: {
        type: String,
        required: true,
    },
}, {timestamps: true});

export const Admin=mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);