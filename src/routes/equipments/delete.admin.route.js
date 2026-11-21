
import Router from "express";

import { sendAPIResponse } from "../../utils/apiResponse.js";
import { equipment } from "../../config/db.js";
import { ObjectId } from "mongodb";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";

const adminActionRouter = Router();

adminActionRouter.delete("/delete/:id",checkAuthenticateUser,verifyRole("admin"),async (request, response) => {
    try {
      const { id } = request.params;

      // Validate equipment ID
      if (!ObjectId.isValid(id)) {
        return sendAPIResponse(response,null,false,400,"Invalid equipment ID");
      }

      // Check if equipment exists
      const existingEquipment = await equipment.findOne({ _id: new ObjectId(id),});

      if (!existingEquipment) {
        return sendAPIResponse(response,null,false,404,"Equipment not found");
      }

      // Delete equipment
      const result = await equipment.deleteOne({_id: new ObjectId(id),});

      if (result.deletedCount === 0) {
        return sendAPIResponse(response,null,false,400,"Failed to delete equipment");
      }

      return sendAPIResponse(response,{ deletedId: id },true,200,"Equipment deleted successfully");
    } catch (error) {
      console.error("Delete equipment error:", error);
      return sendAPIResponse(response,null,false,500,"Internal server error");
    }
  }
);

export default adminActionRouter