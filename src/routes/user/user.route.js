import { Router } from "express";
import { user } from "../../config/db.js";
import { ApiError } from "../../utils/apiError.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";
import { checkAuthenticateUser } from "../../middleware/auth.js";

const userRouter = Router();

userRouter.get("/",checkAuthenticateUser, async (request, response) => {
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

export default userRouter;
