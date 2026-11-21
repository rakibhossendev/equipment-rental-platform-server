import Router from "express";
import { equipment, bookings } from "./../../config/db.js"
import { sendAPIResponse } from "../../utils/apiResponse.js"
import { stripe } from "../../config/stripe.js"
import { env } from "../../config/env.js";
import { ObjectId } from "mongodb";

const paymentRouter = Router();


paymentRouter.post("/stripe", async (request, response) => {
    try {
        const {equipmentId,userEmail,startDate,endDate,quantity,} = request.body;

        // 1. Validate required fields
        if (!ObjectId.isValid(equipmentId) ||!userEmail ||!startDate ||!endDate ||!Number.isInteger(Number(quantity)) ||Number(quantity) < 1) {
            return sendAPIResponse(response,null,false,400,"Invalid booking information");
        }

        // 2. Find equipment
        const service = await equipment.findOne({_id: new ObjectId(equipmentId),});

        if (!service) {
            return sendAPIResponse(response,null,false,404,"Equipment not found");
        }

        // 3. Check availability
        const bookingQuantity = Number(quantity);

        if (bookingQuantity > service.availableQuantity) {
            return sendAPIResponse(response,null,false,400,"Not enough equipment available");
        }

        // 4. Calculate rental duration
        const start = new Date(`${startDate}T00:00:00Z`);
        const end = new Date(`${endDate}T00:00:00Z`);

        if (Number.isNaN(start.getTime()) ||Number.isNaN(end.getTime()) ||end < start ||start < new Date(new Date().toISOString().split("T")[ 0 ] + "T00:00:00Z")) {
            return sendAPIResponse(response,null,false,400,"Invalid rental dates");
        }

        const days =
            Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;

        let duration = 0;

        if (service.rentalType === "Daily") {
            duration = days;
        } else if (service.rentalType === "Weekly") {
            duration = Math.ceil(days / 7);
        } else if (service.rentalType === "Monthly") {
            duration = Math.ceil(days / 30);
        }

        if (!duration) {
            return sendAPIResponse(response,null,false,400,"Invalid rental type");
        }

        // 5. Calculate total price on backend
        const totalPrice =
            service.rentalPrice * duration * bookingQuantity;

        // 6. Create pending booking
        const booking = {
            equipmentId: service._id,
            equipmentName: service.equipmentName,
            userEmail,
            startDate,
            endDate,
            quantity: bookingQuantity,
            rentalDuration: duration,
            rentalType: service.rentalType,
            totalPay: totalPrice,
            bookingStatus: "Pending",
            paymentStatus: "Pending",
            createdAt: new Date(),
        };

        const bookingResult = await bookings.insertOne(booking);

        // 7. Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price_data: {
                        currency: "bdt",
                        product_data: {
                            name: service.equipmentName,
                        },
                        unit_amount: Math.round(totalPrice * 100),
                    },
                    quantity: 1,
                },
            ],

            mode: "payment",

            success_url: `${env.CLIENT_SIDE_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,

            cancel_url: `${env.CLIENT_SIDE_BASE_URL}/cancel`,

            metadata: {
                bookingId: bookingResult.insertedId.toString(),
                equipmentId: service._id.toString(),
                userEmail,
            },

            payment_intent_data: {
                metadata: {
                    bookingId: bookingResult.insertedId.toString(),
                },
            },
        });

        // 8. Save Stripe Session ID
        await bookings.updateOne(
            { _id: bookingResult.insertedId },
            {
                $set: {
                    stripeSessionId: session.id,
                },
            }
        );

        // 9. Return Checkout URL
        return sendAPIResponse(
            response,
            {
                checkoutUrl: session.url,
                bookingId: bookingResult.insertedId,
            },
            true,
            200,
            "Stripe checkout session created successfully"
);
    } catch (error) {
        console.error("Stripe payment error:", error);
        return sendAPIResponse(response,null,false,500,"Failed to create payment session");
    }
});

export default paymentRouter;
