import { Router } from "express";
import { user } from "../../config/db.js";
import { ApiError } from "../../utils/apiError.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";
import { ObjectId } from "mongodb";

const userRouter = Router();

userRouter.get("/", checkAuthenticateUser,verifyRole("admin"), async (request, response) => {
    try {
        const users = await user.find().toArray();

        if (!users || users.length === 0) {
            throw new ApiError(404, "Data not found");
        }

        return sendAPIResponse(response, users, true, 200, "Data fetched successfully");
    } catch (error) {
        console.log(error);
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        return sendAPIResponse(response, null, false, statusCode, message);
    }
});


userRouter.get("/profile", checkAuthenticateUser,verifyRole("admin","owner","customer"), async (request, response) => {
    try {
        const userId = request.user.sub;
        if (!ObjectId.isValid(userId)) {
            throw new ApiError(400, "Invalid user ID");
        }

        const profile = await user.findOne(
            { _id: new ObjectId(userId) },
            { projection: { name: 1, email: 1, image: 1, phoneNumber: 1, address: 1, }, });

        if (!profile) {
            throw new ApiError(404, "Profile not found");
        }

        return sendAPIResponse(response, profile, true, 200, "Profile fetched successfully");
    } catch (error) {
        console.log(error);
        return sendAPIResponse(response, null, false, error.statusCode || 500, error.message || "Internal Server Error");
    }
});


// Update Logged-in User Profile
userRouter.patch("/profile", checkAuthenticateUser,verifyRole("admin","customer","owner"), async (request, response) => {
    try {
        const userId = request.user.sub;
        const { name, image, phoneNumber, address } = request.body;

        if (!ObjectId.isValid(userId)) {
            throw new ApiError(400, "Invalid user ID");
        }

        const updateFields = {};

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                throw new ApiError(400, "Name is required");
            }
            updateFields.name = name.trim();
        }

        if (image !== undefined) {
            if (typeof image !== "string") {
                throw new ApiError(400, "Invalid profile image");
            }
            updateFields.image = image.trim();
        }

        if (phoneNumber !== undefined) {
            if (typeof phoneNumber !== "string") {
                throw new ApiError(400, "Invalid phone number");
            }
            updateFields.phoneNumber = phoneNumber.trim();
        }

        if (address !== undefined) {
            if (typeof address !== "string") {
                throw new ApiError(400, "Invalid address");
            }
            updateFields.address = address.trim();
        }

        if (Object.keys(updateFields).length === 0) {
            throw new ApiError(400, "No profile information provided");
        }
        updateFields.updatedAt = new Date();
        const result = await user.updateOne({ _id: new ObjectId(userId) }, { $set: updateFields });

        if (!result.matchedCount) {
            throw new ApiError(404, "User not found");
        }

        const updatedProfile = await user.findOne({ _id: new ObjectId(userId) }, { projection: { name: 1, email: 1, image: 1, phoneNumber: 1, address: 1, }, });

        return sendAPIResponse(response, updatedProfile, true, 200, "Profile updated successfully");
    } catch (error) {
        console.log(error);
        return sendAPIResponse(response, null, false, error.statusCode || 500, error.message || "Internal Server Error");
    }
});

export default userRouter;
