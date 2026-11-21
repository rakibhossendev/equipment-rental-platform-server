import { Router } from "express";
import { bookings,equipment,user} from "../../config/db.js";
import { checkAuthenticateUser, verifyRole } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";

const ownerRentalsRouter = Router();

ownerRentalsRouter.get("/", checkAuthenticateUser, verifyRole("owner"), async (request, response) => {
    try {
        const ownerEmail = request.user.email;

        // Step 1: Find all equipment of the logged-in owner
        const ownerEquipments = await equipment.find({ creatorEmail: ownerEmail }).toArray();

        if (ownerEquipments.length === 0) {
            return sendAPIResponse(response, [], true, 200, "No equipment found");
        }

        // Step 2: Get all equipment IDs
        const equipmentIds = ownerEquipments.map((item) => item._id);

        // Step 3: Find bookings for owner's equipment
        const allBookings = await bookings.find({ equipmentId: { $in: equipmentIds }, }).sort({ createdAt: -1 }).toArray();

        // Step 4: Get customer information for each booking
        const rentalData = [];

        for (const booking of allBookings) {
            const customer = await user.findOne({
                email: booking.userEmail,
            });

            const equipmentData = ownerEquipments.find(
                (item) =>
                    item._id.toString() === booking.equipmentId.toString()
            );

            rentalData.push({
                _id: booking._id,

                customerInformation: {
                    name: customer?.name || "Unknown Customer",
                    email: booking.userEmail,
                    phone: customer?.phone || "N/A",
                },

                equipmentInformation: {
                    equipmentName: equipmentData?.equipmentName,
                    brand: equipmentData?.brand,
                    model: equipmentData?.model,
                    equipmentImage: equipmentData?.equipmentImage,
                },

                rentalDuration: {
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    duration: booking.rentalDuration,
                    rentalType: booking.rentalType,
                },

                quantity: booking.quantity,
                bookingAmount: booking.totalPay,
                paymentStatus: booking.paymentStatus,
                bookingStatus: booking.bookingStatus,
                createdAt: booking.createdAt,
            });
        }

        return sendAPIResponse(response, rentalData, true, 200, "Owner rental bookings fetched successfully");
    } catch (error) {
        console.error("Get owner rentals error:", error);
        return sendAPIResponse(response, null, false, 500, "Internal server error");
    }
}
);

export default ownerRentalsRouter;
