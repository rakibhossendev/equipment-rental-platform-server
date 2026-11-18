
import { Router } from "express";
import { equipment } from "../../config/db.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";

const addEquipmentRouter = Router();

addEquipmentRouter.post("/", async (request, response) => {
    try {
        const data = request.body;

        const result = await equipment.insertOne(data);

        return sendAPIResponse(
            response,
            { insertedId: result.insertedId },
            true,
            201,
            "Equipment added successfully"
        );

    } catch (error) {
        console.error("Add equipment error:", error);

        return sendAPIResponse(
            response,
            null,
            false,
            error.statusCode || 500,
            error.message || "Internal server error"
        );
    }
});

export default addEquipmentRouter;
