import { Router } from "express";
import { checkAuthenticateUser,verifyRole } from "../../middleware/auth.js";
import { ObjectId } from "mongodb";
import { sendAPIResponse } from "../../utils/apiResponse.js";
import { equipment } from "../../config/db.js";

const updateEquipmentStatusRouter = Router();

updateEquipmentStatusRouter.patch("/:id", checkAuthenticateUser, verifyRole("admin"), async (request, response) => {
    try {
        const { id } = request.params;
        const { status } = request.body;

        const allowedStatus = [ "Pending", "Approved", "Rejected" ];

        if (!ObjectId.isValid(id)) {
            return sendAPIResponse(response, null, false, 400, "Invalid Equipment Id");
        }
        if (!allowedStatus.includes(status)) {
            return sendAPIResponse(response, null, false, 400, "Invalid Equipment Status")
        }
        const result = await equipment.updateOne({ _id: new ObjectId(id) }, { $set: { status } });

        if (!result.matchedCount) {
            return sendAPIResponse(response, null, false, 404, "Equipment not found");
        }

        return sendAPIResponse(response, result, true, 200, "Status updated successfully");
    } catch (error) {
        console.log(error)
        return sendAPIResponse(response,null,false,500,"Internal server error");
    }
})

export default updateEquipmentStatusRouter;