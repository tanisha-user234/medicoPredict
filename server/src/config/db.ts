import mongoose from "mongoose";

const connectDB=async ():Promise<void>=>{
    try {
        const conn = await mongoose.connect("mongodb://localhost:27017/");
        console.log(`MongoDB sucessfully connected on ${conn.connection.port}`);

    } catch (err:any) {
        console.error("Error in the connection",err.message);
        process.exit(1);
    }
}

export default connectDB;