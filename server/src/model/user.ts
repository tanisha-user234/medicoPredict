import mongoose, { Schema } from "mongoose";

export interface IMedication{
  drugName:string;
  dosage:string;
  frequency:string;
  startDate:Date;
  warnings:string[];
}

export interface IUser{
    name:string;
    email:string;
    passwordHash:string;
    medication:IMedication[];
    createdAt:Date;
}
//string->type String=->value
const MedicationScehma= new Schema<IMedication>({
    drugName:{type:String,required:true},
    dosage:{type:String,required:true},
    frequency:{type:String,default:"Daily"},
    startDate:{type:Date, default:Date.now},
    warnings:[{type:String}]
});

const userSchema= new Schema<IUser>({
    name:{type:String,required:true},
    email:{type:String,required:true,unique:true},
    passwordHash:{type:String,required:true},
    medication:[MedicationScehma],//embeds the medication schema directly in the user schema as we are using noSQL database
    createdAt:{type:Date,default:Date.now}
});

export default mongoose.model<IUser>('User',userSchema);