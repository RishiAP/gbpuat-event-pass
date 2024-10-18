import mongoose,{Schema, Document} from "mongoose";

export interface IDepartment extends Document{
    name:string;
    college:Schema.Types.ObjectId;
    location:string;
}

const DepartmentSchema=new Schema<IDepartment>({
    name:{
        type: String,
        required: true,
        unique:true
    },
    college:{
        type: Schema.Types.ObjectId,
        ref: 'College',
        required: true
    },
    location:{
        type: String,
        required: true
    }
},{timestamps: true});

export const Department=mongoose.models.Department || mongoose.model<IDepartment>('Department', DepartmentSchema);