import mongoose,{Schema, Document} from "mongoose";

export interface ICollege extends Document{
    name:string
    location:string;
    established:number;
}

export const CollegeSchema=new Schema<ICollege>({
    name:{
        type: String,
        required: true,
        unique:true
    },
    location:{
        type: String,
        required: true
    },
    established:{
        type: Number,
        required: true
    }
},{timestamps: true});

export const College=mongoose.models.College || mongoose.model<ICollege>('College', CollegeSchema);