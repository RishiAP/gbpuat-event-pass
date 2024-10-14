import mongoose,{Schema, Document} from "mongoose";

export interface IEvent extends Document{
    title: string;
    description: string;
    date: Date;
    location: string;
    status: string;
    participants: number;
}

const EventSchema=new Schema<IEvent>({
    title:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    date:{
        type: Date,
        required: true
    },
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
    }
},{timestamps: true});

export const Event=mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);