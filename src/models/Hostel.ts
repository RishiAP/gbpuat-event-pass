import mongoose, { Schema, Document } from "mongoose";

// IUser Interface Definition
export interface IHostel extends Document {
    name: string;
}

// User Schema Definition
const HostelSchema = new Schema<IHostel>({
    name: {
        type: String,
        required: true,
        unique: true,
    }
});

// Export User Model
export const Hostel = mongoose.models.Hostel || mongoose.model<IHostel>('Hostel', HostelSchema);