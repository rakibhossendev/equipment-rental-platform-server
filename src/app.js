import express from "express";
import cors from "cors"
import homeRouter from "./routes/home.route.js";
import morgan from "morgan"
import userRouter from "./routes/user/user.route.js";
import addEquipmentRouter from "./routes/equipments/add-equipments.route.js";
import getEquipmentsRouter from "./routes/equipments/get.equipment.route.js";
import updateUserRoleRouter from "./routes/user/updateUserRole.route.js";
import updateEquipmentStatusRouter from "./routes/equipments/updateStatus.route.js";
import ownerEquipmentsRouter from "./routes/equipments/my-equipment.route.js";
import paymentRouter from "./routes/booking/payment.route.js";
import webhookRouter from "./routes/booking/webhook.route.js";
import myRentalsRouter from "./routes/rentals/myRental.route.js";
import favoriteRouter from "./routes/favorite/favorite.route.js";
import adminRentalsRouter from "./routes/rentals/adminRental.route.js";


const app = express();

app.use(cors());
app.use(morgan("dev"));


app.use(
    "/payments/webhook",
    express.raw({ type: "application/json" }),
    webhookRouter
);


app.use(express.json());

app.use("/", homeRouter);
app.use("/users", userRouter);
app.use("/add-equipment", addEquipmentRouter);
app.use("/equipments", getEquipmentsRouter);
app.use("/update-user-role", updateUserRoleRouter);
app.use("/update-equipment-status", updateEquipmentStatusRouter);
app.use("/my-equipments", ownerEquipmentsRouter);
app.use("/payments", paymentRouter);
app.use("/my-rentals",myRentalsRouter);
app.use("/favorites",favoriteRouter);
app.use("/all-rentals",adminRentalsRouter)

export default app;