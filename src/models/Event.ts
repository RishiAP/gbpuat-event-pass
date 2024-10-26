import mongoose,{Schema, Document} from "mongoose";

export interface IEvent extends Document{
    title: string;
    description: string;
    date: Date;
    location: string;
    status: string;
    participants: number;
    attended: number;
    emails_sent: number;
    verifiers: {verifier:Schema.Types.ObjectId,no_of_users:number}[];
}

const EventSchema=new Schema<IEvent>({
    title:{
        type: String,
        required: true,
        unique:true
    },
    description:{
        type: String,
        required: true
    },
    date:{
        type: Date,
        required: true
    },
    verifiers:[{
        verifier:{
            type: Schema.Types.ObjectId,
            ref: 'Verifier',
            required: true
        },
        no_of_users:{
            type: Number,
            required: true
        }
    }],
    location:{
        type: String,
        required: true
    },
    status:{
        type: String,
        required: true
    },
    participants:{
        type: Number,
        required: true,
        default:0
    },
    attended:{
        type: Number,
        required: true,
        default:0
    },
    emails_sent:{
        type: Number,
        required: true,
        default:0
    }
},{timestamps: true});

export const Event=mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);