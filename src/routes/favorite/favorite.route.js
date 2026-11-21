import { Router } from "express";
import { ObjectId } from "mongodb";
import { equipment, favorites } from "../../config/db.js";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";

const favoriteRouter = Router();

favoriteRouter.post("/", checkAuthenticateUser, verifyRole("customer"), async (request, response) => {
    try {
        const { equipmentId } = request.body;

        // Authenticated user information
        const userEmail = request.user?.email;
        const userId = request.user?.id || request.user?.sub;

        if (!userEmail || !userId) {
            return sendAPIResponse(response, null, false, 401, "Unauthorized access");
        }

        // Validate equipment ID
        if (!equipmentId || !ObjectId.isValid(equipmentId)) {
            return sendAPIResponse(response, null, false, 400, "Invalid equipment ID");
        }

        // Check equipment existence
        const equipmentData = await equipment.findOne({ _id: new ObjectId(equipmentId), });

        if (!equipmentData) {
            return sendAPIResponse(response, null, false, 404, "Equipment not found");
        }

        // Check duplicate favorite
        const existingFavorite = await favorites.findOne({ equipmentId: new ObjectId(equipmentId), userId, });

        if (existingFavorite) {
            return sendAPIResponse(response, null, false, 409, "Equipment already added to favorites");
        }

        // Prepare favorite data
        const favoriteData = {
            equipmentId: new ObjectId(equipmentId),
            userId,
            userEmail,
            equipmentName: equipmentData.equipmentName,
            category: equipmentData.category,
            equipmentImage: equipmentData.equipmentImage,
            createdAt: new Date(),
        };

        const result = await favorites.insertOne(favoriteData);

        return sendAPIResponse(
            response,
            {
                _id: result.insertedId,
                ...favoriteData,
            }, true, 201, "Equipment added to favorites successfully");
    } catch (error) {
        console.error("Add favorite error:", error);

        return sendAPIResponse(response, null, false, 500, "Internal server error");
    }
});

export default favoriteRouter;