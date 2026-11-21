import express from "express";
import cors from "cors"
import router from "./routes/home.route.js";
import morgan from "morgan"
import userRouter from "./routes/user/user.route.js";
import addEquipmentRouter from "./routes/equipments/add-equipments.route.js";
import getEquipmentsRouter from "./routes/equipments/get.equipment.route.js";
import updateUserRoleRouter from "./routes/user/updateUserRole.route.js";
import updateEquipmentStatusRouter from "./routes/equipments/updateStatus.route.js";
import ownerEquipmentsRouter from "./routes/equipments/my-equipment.route.js";
import paymentRouter from "./routes/booking/payment.route.js";
import webhookRouter from "./routes/booking/webhook.route.js";


const app = express();

app.use(cors());
app.use(morgan("dev"));


app.use(
    "/payments/webhook",
    express.raw({ type: "application/json" }),
    webhookRouter
);


app.use(express.json());

app.use("/", router);
app.use("/users", userRouter);
app.use("/add-equipment", addEquipmentRouter);
app.use("/equipments", getEquipmentsRouter);
app.use("/update-user-role", updateUserRoleRouter);
app.use("/update-equipment-status", updateEquipmentStatusRouter);
app.use("/my-equipments", ownerEquipmentsRouter);
app.use("/payments", paymentRouter);

export default app;