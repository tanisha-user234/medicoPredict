import dotenv from 'dotenv';
import connectDB from './config/db';
import express,{Request,Response} from 'express';
import cors from 'cors'
//
dotenv.config();

const app=express();

//CREATING THE MIDDLEWARES
app.use(cors());
app.use(express.json());

connectDB();

app.get('/',(req:Request,res:Response)=>{
    res.send("Medico is running")
});
//we are making sure here that our port number must be an number 
//if env variable is returning undefined then use 5000
const PORT : number=process.env.PORT? parseInt(process.env.PORT, 10) :5000;
//STARTING THE SERVER AND LISTENING TO THE PORT SPECIFIED
app.listen(PORT,()=>{
      console.log(`Server listening to port ${PORT}`);
})

