import { Router } from "express";

import { user,equipment,bookings } from "../config/db.js";
import { sendAPIResponse } from "../../src/utils/apiResponse.js";

const homeRouter = Router();

homeRouter.get("/", (request, response) => {
    response.send("<h1>Express server is running..</h1>")
})

homeRouter.get("/home-data", async (request, response) => {
    try {
        const featuredEquipment = await equipment.find({ status: "Approved", availableQuantity: { $gt: 0 } }).sort({ createdAt: -1 }).limit(6).toArray();
        const recentEquipment = await equipment.find({ status: "Approved", availableQuantity: { $gt: 0 } }).sort({ createdAt: -1 }).limit(4).toArray();
        const categories = await equipment.distinct("category", { status: "Approved", });

        const totalEquipment = await equipment.countDocuments({ status: "Approved", });
        const totalOwners = await user.countDocuments({ role: "owner" });
        const totalCustomers = await user.countDocuments({ role: "customer", });

        const completedRentals = await bookings.countDocuments({ bookingStatus: "Completed", paymentStatus: "Paid", });

        return sendAPIResponse(response,
            {
                featuredEquipment,
                recentEquipment,
                categories,
                stats: {
                    totalEquipment,
                    totalOwners,
                    totalCustomers,
                    completedRentals,
                },
            }, true, 200, "Homepage data fetched successfully");
    } catch (error) {
        console.error("Homepage API error:", error);

        return sendAPIResponse(
            response,
            null,
            false,
            500,
            "Internal server error"
        );
    }
});


export default homeRouter