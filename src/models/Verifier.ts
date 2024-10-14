import mongoose,{Schema, Document} from "mongoose";

export interface IVerifier extends Document{
    username: string;
    name: string;
    password: string;
    sessionToken: string;
}

const VerifierSchema=new Schema<IVerifier>({
    username:{
        type: String,
        required: true,
        unique: true
    },
    name:{
        type: String,
        required: true
    },
    password:{
        type: String,
        required: true
    },
    sessionToken:{
        type: String,
        required: true
    }
},{timestamps: true});

export const Verifier=mongoose.models.Verifier || mongoose.model<IVerifier>('Verifier', VerifierSchema);