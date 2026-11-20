import { Router } from "express";
import { ObjectId } from "mongodb";

import { user } from "../../config/db.js";
import { checkAuthenticateUser,verifyRole } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";

const updateUserRoleRouter = Router();

updateUserRoleRouter.patch("/:id", checkAuthenticateUser, verifyRole("admin"), async (request, response) => {
    try {
        const { id } = request.params;
        const { role } = request.body;

        const allowedRoles = [ "admin", "owner", "customer" ];
        if (!ObjectId.isValid(id)) {
            return sendAPIResponse(response, null, false, 400, "Invalid user ID");
        }
        if (!allowedRoles.includes(role)) {
            return sendAPIResponse(response, null, false, 400, "Invalid user role");
        }

        const result = await user.updateOne({ _id: new ObjectId(id) }, { $set: { role }, });
        
        if (!result.matchedCount) {
            return sendAPIResponse(response, null, false, 404, "User not found");
        }

        return sendAPIResponse(response, null, true, 200, "User role updated successfully");
    } catch (error) {
        console.error("Role update error:", error);
        return sendAPIResponse(response, null, false, 500, "Failed to update user role");
    }
}
);

export default updateUserRoleRouter;