
import express from "express";
import { bookings,user,equipment } from "../../config/db.js";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";



const adminRentalsRouter = express.Router();


adminRentalsRouter.get("/",checkAuthenticateUser,verifyRole("admin"),async (request, response) => {
    try {
      // Get all bookings
      const allBookings = await bookings.find().sort({ createdAt: -1 }).toArray();

      const rentals = [];

      // Get customer, equipment and owner information
      for (const booking of allBookings) {
        const equipmentData = await equipment.findOne({_id: booking.equipmentId,});
        const customerData = await user.findOne({email: booking.userEmail,});
        const ownerData = await user.findOne({email: equipmentData?.creatorEmail,});

        rentals.push({...booking,
          customerInformation: {
            name: customerData?.name || "Unknown",
            email: booking.userEmail,
            phone: customerData?.phone || "N/A",
          },

          ownerInformation: {
            name: ownerData?.name || equipmentData?.ownerInformation?.name || "Unknown",
            email: ownerData?.email || equipmentData?.creatorEmail || "N/A",
            phone: ownerData?.phone || equipmentData?.ownerInformation?.phone || "N/A",
          },
        });
      }

      return sendAPIResponse(response,rentals,true,200,"All rental bookings fetched successfully");
    } catch (error) {
      console.error("Get all rentals error:", error);
      return sendAPIResponse(response,null,false,500,"Internal server error");
    }
  }
);

export default adminRentalsRouter;

