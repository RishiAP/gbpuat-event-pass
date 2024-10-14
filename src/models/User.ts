import mongoose, { Schema, Document } from "mongoose";

// IUser Interface Definition
export interface IUser extends Document {
    email: string;
    name: string;
    events: Map<Schema.Types.ObjectId, { status: boolean; verifier: Schema.Types.ObjectId }>;  // Verifier as ObjectId
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
    events: {
        type: Map,
        of: new Schema({
            status: {
                type: Boolean,  // Event participation status
                required: true,
                default: false,  // Default status is false (not participating)
            },
            verifier: {
                type: Schema.Types.ObjectId,  // Reference to Verifier model (as ObjectId)
                ref: 'Verifier',  // Specify that verifier refers to the Verifier model
                required: true,  // Verifier cannot be null
            },
        }),
        default: {},
    },
}, { timestamps: true });

// Export User Model
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);