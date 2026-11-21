
import Router from "express";

import { sendAPIResponse } from "../../utils/apiResponse.js";
import { equipment } from "../../config/db.js";
import { ObjectId } from "mongodb";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";

const adminActionRouter = Router();

adminActionRouter.delete("/delete/:id", checkAuthenticateUser, verifyRole("admin"), async (request, response) => {
  try {
    const { id } = request.params;

    // Validate equipment ID
    if (!ObjectId.isValid(id)) {
      return sendAPIResponse(response, null, false, 400, "Invalid equipment ID");
    }

    // Check if equipment exists
    const existingEquipment = await equipment.findOne({ _id: new ObjectId(id), });

    if (!existingEquipment) {
      return sendAPIResponse(response, null, false, 404, "Equipment not found");
    }

    // Delete equipment
    const result = await equipment.deleteOne({ _id: new ObjectId(id), });

    if (result.deletedCount === 0) {
      return sendAPIResponse(response, null, false, 400, "Failed to delete equipment");
    }

    return sendAPIResponse(response, { deletedId: id }, true, 200, "Equipment deleted successfully");
  } catch (error) {
    console.error("Delete equipment error:", error);
    return sendAPIResponse(response, null, false, 500, "Internal server error");
  }
}
);


adminActionRouter.patch("/update/:id", checkAuthenticateUser, verifyRole("admin"), async (request, response) => {
  try {
    const { id } = request.params;

    if (!ObjectId.isValid(id)) {
      return sendAPIResponse(response, null, false, 400, "Invalid equipment ID");
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

    // Only allow approved fields
    for (const field of allowedFields) {
      if (request.body[ field ] !== undefined) {
        updateData[ field ] = request.body[ field ];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return sendAPIResponse(response, null, false, 400, "No valid fields provided for update");
    }

    // Validate numeric fields
    if (updateData.rentalPrice !== undefined && (typeof updateData.rentalPrice !== "number" || !Number.isFinite(updateData.rentalPrice) || updateData.rentalPrice < 0)) {
      return sendAPIResponse(response, null, false, 400, "Invalid rental price");
    }

    if (updateData.availableQuantity !== undefined && (!Number.isInteger(updateData.availableQuantity) || updateData.availableQuantity < 0)) {
      return sendAPIResponse(response, null, false, 400, "Invalid available quantity");
    }
    const existingEquipment = await equipment.findOne({ _id: new ObjectId(id), });

    if (!existingEquipment) {
      return sendAPIResponse(response, null, false, 404, "Equipment not found");
    }
    updateData.updatedAt = new Date();
    const result = await equipment.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.modifiedCount === 0) {
      return sendAPIResponse(response, null, false, 400, "No changes made to equipment");
    }

    const updatedEquipment = await equipment.findOne({ _id: new ObjectId(id), });

    return sendAPIResponse(response, updatedEquipment, true, 200, "Equipment updated successfully");
  } catch (error) {
    console.error("Update equipment error:", error);
    return sendAPIResponse(response, null, false, 500, "Internal server error");
  }
}
);

export default adminActionRouter