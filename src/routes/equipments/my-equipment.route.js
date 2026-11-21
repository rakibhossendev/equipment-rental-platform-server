import { Router } from "express";
import { verifyRole } from "../../middleware/auth.js";
import { checkAuthenticateUser } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";
import { equipment } from "../../config/db.js";

const ownerEquipmentsRouter = Router();

ownerEquipmentsRouter.get("/", checkAuthenticateUser,verifyRole("owner"), verifyRole("owner"),
    async (request, response) => {
        try {
            const creatorEmail = request.user.email;
            const data = await equipment.find({ creatorEmail }).sort({ createdAt: -1 }).toArray();
            return sendAPIResponse(response, data, true, 200, "Owner equipments fetched successfully");
        } catch (error) {
            console.error("Get owner equipments error:", error);
            return sendAPIResponse(response, null, false, 500, "Internal server error");
        }
    }
);

export default ownerEquipmentsRouter;