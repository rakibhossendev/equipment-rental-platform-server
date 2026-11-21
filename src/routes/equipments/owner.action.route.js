
import Router from "express";

import { sendAPIResponse } from "../../utils/apiResponse.js";
import { equipment } from "../../config/db.js";
import { ObjectId } from "mongodb";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";


const ownerActionRouter = Router();


ownerActionRouter.patch("/update/:id", checkAuthenticateUser, verifyRole("owner"), async (request, response) => {
    try {
        const { id } = request.params;
        const ownerEmail = request.user.email;

        if (!ObjectId.isValid(id)) {
            return sendAPIResponse(response, null, false, 400, "Invalid equipment ID");
        }

        // Find equipment owned by logged-in owner
        const existingEquipment = await equipment.findOne({ _id: new ObjectId(id), creatorEmail: ownerEmail, });

        if (!existingEquipment) {
            return sendAPIResponse(response, null, false, 404, "Equipment not found or unauthorized");
        }

        const allowedFields = [
            "equipmentName",
            "description",
            "category",
            "location",
            "rentalPrice",
            "rentalType",
            "availableQuantity",
            "equipmentCondition",
            "brand",
            "model",
            "equipmentImage",
            "rentalTermsAndConditions",
        ];

        const updateData = {};

        // Update allowed equipment fields
        for (const field of allowedFields) {
            if (request.body[ field ] !== undefined) {
                updateData[ field ] = request.body[ field ];
            }
        }

        // Allow owner to update personal information
        if (request.body.ownerInformation) {
            const allowedOwnerFields = [ "name", "phone", "address" ];

            for (const field of allowedOwnerFields) {
                if (request.body.ownerInformation[ field ] !== undefined) {
                    updateData[ `ownerInformation.${field}` ] =
                        request.body.ownerInformation[ field ];
                }
            }
        }

        if (Object.keys(updateData).length === 0) {
            return sendAPIResponse(response, null, false, 400, "No valid fields provided for update");
        }

        // Validate rental price
        if (
            updateData.rentalPrice !== undefined &&
            (typeof updateData.rentalPrice !== "number" ||
                !Number.isFinite(updateData.rentalPrice) ||
                updateData.rentalPrice < 0)
        ) {
            return sendAPIResponse(response, null, false, 400, "Invalid rental price");
        }

        // Validate available quantity
        if (
            updateData.availableQuantity !== undefined &&
            (!Number.isInteger(updateData.availableQuantity) ||
                updateData.availableQuantity < 0)
        ) {
            return sendAPIResponse(response, null, false, 400, "Invalid available quantity");
        }

        // Approved equipment must be reviewed again after editing
        if (existingEquipment.status === "Approved") {
            updateData.status = "Pending";
        }

        updateData.updatedAt = new Date();

        await equipment.updateOne(
            {
                _id: new ObjectId(id),
                creatorEmail: ownerEmail,
            },
            {
                $set: updateData,
            }
        );

        const updatedEquipment = await equipment.findOne({
            _id: new ObjectId(id),
        });

        return sendAPIResponse(
            response,
            updatedEquipment,
            true,
            200,
            existingEquipment.status === "Approved"
                ? "Equipment updated successfully. It is now pending admin approval."
                : "Equipment updated successfully"
        );
    } catch (error) {
        console.error("Owner update equipment error:", error);

        return sendAPIResponse(
            response,
            null,
            false,
            500,
            "Internal server error"
        );
    }
}
);

ownerActionRouter.delete("/delete/:id", checkAuthenticateUser, verifyRole("owner"), async (request, response) => {
    try {
        const { id } = request.params;
        const ownerEmail = request.user?.email;

        if (!ObjectId.isValid(id)) {
            return sendAPIResponse(response, null, false, 400, "Invalid equipment ID");
        }

        // Verify equipment exists and belongs to the authenticated owner
        const existingEquipment = await equipment.findOne({
            _id: new ObjectId(id),
            creatorEmail: ownerEmail,
        });

        if (!existingEquipment) {
            return sendAPIResponse(response, null, false, 404, "Equipment not found or unauthorized");
        }

        const result = await equipment.deleteOne({
            _id: new ObjectId(id),
            creatorEmail: ownerEmail,
        });

        if (result.deletedCount === 0) {
            return sendAPIResponse(response, null, false, 400, "Failed to delete equipment");
        }

        return sendAPIResponse(response, { deletedId: id }, true, 200, "Equipment deleted successfully");
    } catch (error) {
        console.error("Owner delete equipment error:", error);
        return sendAPIResponse(response, null, false, 500, "Internal server error");
    }
});

export default ownerActionRouter