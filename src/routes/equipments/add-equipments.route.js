
import { Router } from "express";
import { equipment } from "../../config/db.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";

const addEquipmentRouter = Router();

addEquipmentRouter.post("/",checkAuthenticateUser,verifyRole("owner"), async (request, response) => {
    try {
        const data = request.body;
        const ownerEmail = request.user?.email;

        // Ensure newly created equipment strictly receives "Pending" status and proper owner/timestamps
        const newEquipment = {
            ...data,
            creatorEmail: ownerEmail || data.creatorEmail,
            rentalPrice: Number(data.rentalPrice),
            availableQuantity: Number(data.availableQuantity),
            status: "Pending", // Server-enforced: overrides any arbitrary client status
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await equipment.insertOne(newEquipment);
        return sendAPIResponse(response,{ insertedId: result.insertedId, status: "Pending" },true,201,"Equipment added successfully");

    } catch (error) {
        console.error("Add equipment error:", error);
        return sendAPIResponse(response,null,false,error.statusCode || 500,error.message || "Internal server error");
    }
});

export default addEquipmentRouter;
