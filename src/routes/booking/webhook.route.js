import express from "express";
import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { bookings } from "../../config/db.js"

const webhookRouter = express.Router();

webhookRouter.post("/", async (request, response) => {
  const signature = request.headers[ "stripe-signature" ];

  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("Webhook signature error:", error.message);
    return response.status(400).send("Invalid webhook signature");
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      // 2. Verify payment status
      if (session.payment_status !== "paid") {
        return response.status(200).json({received: true,message: "Payment is not completed",});
      }

      const bookingId = session.metadata?.bookingId;

      if (!bookingId || !ObjectId.isValid(bookingId)) {
        return response.status(400).send("Invalid booking ID");
      }

      // 3. Find booking
      const booking = await bookings.findOne({_id: new ObjectId(bookingId),});

      if (!booking) {
        return response.status(404).send("Booking not found");
      }

      // 4. Prevent duplicate payment records
      await payments.updateOne(
        { stripeSessionId: session.id },
        {
          $setOnInsert: {
            bookingId: booking._id,
            userEmail: booking.userEmail,
            stripeSessionId: session.id,
            transactionId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id,
            amount: session.amount_total / 100,
            currency: session.currency,
            paymentStatus: "Paid",
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      // 5. Update booking payment status
      await bookings.updateOne(
        {
          _id: booking._id,
          paymentStatus: { $ne: "Paid" },
        },
        {
          $set: {
            paymentStatus: "Paid",
            bookingStatus: "Confirmed",
            paidAt: new Date(),
          },
        }
      );
    }

    return response.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return response.status(500).json({
      message: "Webhook processing failed",
    });
  }
});

export default webhookRouter;