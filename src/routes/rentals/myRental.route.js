import { Router } from "express";
import { bookings } from "../../config/db.js";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";

const myRentalsRouter = Router();

myRentalsRouter.get("/", checkAuthenticateUser, verifyRole("customer"), async (request, response) => {
  try {
    const userEmail = request.user?.email;

    if (!userEmail) {
      return sendAPIResponse(response, null, false, 401, "Unauthorized access");
    }

    const rentals = await bookings.find({ userEmail }).sort({ createdAt: -1 }).project({
      equipmentName: 1,
      startDate: 1,
      endDate: 1,
      createdAt: 1,
      totalPay: 1,
      paymentStatus: 1,
      bookingStatus: 1,
    }).toArray();

    return sendAPIResponse(response,rentals,true,200,"My rentals fetched successfully");
  } catch (error) {
    console.error("Get my rentals error:", error);

    return sendAPIResponse(response,null,false,500,"Internal server error");
  }
});

export default myRentalsRouter;