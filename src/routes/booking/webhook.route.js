
import express from "express";
import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { client, bookings, equipment, payments } from "../../config/db.js";
import { stripe } from "../../config/stripe.js";

const webhookRouter = express.Router();

webhookRouter.post("/", async (request, response) => {
  console.log("🔥 WEBHOOK RECEIVED");

  const signature = request.headers[ "stripe-signature" ];

  let event;

  // 1. Verify Stripe webhook signature
  try {
    event = stripe.webhooks.constructEvent(
      request.body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature error:", error.message);
    return response.status(400).send("Invalid webhook signature");
  }

  try {
    if (event.type !== "checkout.session.completed") {
      return response.status(200).json({ received: true });
    }

    const session = event.data.object;

    console.log("Event type:", event.type);

    console.log("Session ID:", session.id);
    console.log("Metadata:", session.metadata);
    console.log("Booking ID:", session.metadata?.bookingId);
    console.log("Session metadata:", session.metadata);
    // 2. Check payment status
    if (session.payment_status !== "paid") {
      return response.status(200).json({
        received: true,
        message: "Payment is not completed",
      });
    }

    const bookingId = session.metadata?.bookingId;


    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return response.status(400).send("Invalid booking ID");
    }

    const bookingObjectId = new ObjectId(bookingId);

    // 3. Start MongoDB transaction
    const dbSession = client.startSession();

    try {
      await dbSession.withTransaction(async () => {
        // 4. Find booking
        const booking = await bookings.findOne(
          { _id: bookingObjectId },
          { session: dbSession }
        );

        if (!booking) {
          throw new Error("Booking not found");
        }

        // 5. Prevent duplicate quantity deduction
        if (booking.paymentStatus === "Paid") {
          return;
        }

        // 6. Deduct equipment quantity
        const quantityResult = await equipment.updateOne(
          {
            _id: booking.equipmentId,
            availableQuantity: { $gte: booking.quantity },
          },
          {
            $inc: {
              availableQuantity: -booking.quantity,
            },
          },
          { session: dbSession }
        );

        if (quantityResult.modifiedCount !== 1) {
          throw new Error("Equipment quantity is not available");
        }

        // 7. Update booking status
        await bookings.updateOne(
          {
            _id: bookingObjectId,
            paymentStatus: { $ne: "Paid" },
          },
          {
            $set: {
              paymentStatus: "Paid",
              bookingStatus: "Confirmed",
              paidAt: new Date(),
            },
          },
          { session: dbSession }
        );

        // 8. Save payment record
        await payments.updateOne(
          { stripeSessionId: session.id },
          {
            $setOnInsert: {
              bookingId: booking._id,
              userEmail: booking.userEmail,
              stripeSessionId: session.id,
              transactionId: session.payment_intent,
              amount: session.amount_total / 100,
              currency: session.currency,
              paymentStatus: "Paid",
              createdAt: new Date(),
            },
          },
          {
            upsert: true,
            session: dbSession,
          }
        );
      });

      return response.status(200).json({
        received: true,
        message: "Payment processed successfully",
      });
    } finally {
      await dbSession.endSession();
    }
  } catch (error) {
    console.error("Webhook processing error:", error);

    return response.status(500).json({
      message: "Webhook processing failed",
    });
  }
});

export default webhookRouter;
