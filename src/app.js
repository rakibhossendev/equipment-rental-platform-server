import express from "express";
import cors from "cors"
import router from "./routes/home.route.js";
import morgan from "morgan"
import userRouter from "./routes/user/user.route.js";
import addEquipmentRouter from "./routes/equipments/add-equipments.route.js";

const app = express();

app.use(express.json());
app.use(cors())
app.use(morgan('dev'))

app.use("/",router)
app.use("/users",userRouter)
app.use("/add-equipment",addEquipmentRouter);

export default app;