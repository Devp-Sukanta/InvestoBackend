import dotenv from 'dotenv';

import express from 'express';
import { successMessage } from './utils/Message.js';
import connection from './config/Db.js';
import userRoute from './routes/user.route.js';
import investmentRoute from './routes/investment.route.js';
import referrelRoute from './routes/referrel.route.js';
import dashboardRoute from './routes/dashboard.route.js';
import cors from 'cors'


dotenv.config();


const app = express();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://investo-app.netlify.app",

  ],
  optionsSuccessStatus: 200,
};

app.use(express.json());
app.use(cors(corsOptions))

const PORT = process.env.PORT || 5001;

connection();



app.get("/",(req,res)=>{
    return successMessage(res,200,"api health is ok")
});

app.use("/user", userRoute);
app.use("/investment", investmentRoute);
app.use("/referrel", referrelRoute);
app.use("/dashboard", dashboardRoute);




app.listen(PORT, ()=>{
    console.log(`Api runnig on port ${PORT}`)
});

