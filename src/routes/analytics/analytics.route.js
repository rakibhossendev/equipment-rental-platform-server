import { Router } from "express";
import { bookings, equipment, payments, user } from "../../config/db.js";
import { checkAuthenticateUser } from "../../middleware/auth.js";
import { sendAPIResponse } from "../../utils/apiResponse.js";

const analyticsRouter = Router();

// Helper to get past 6 months formatted as array of { key: "YYYY-MM", label: "MMM YYYY" }
function getLast6Months() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = d.getFullYear();
        const monthNum = String(d.getMonth() + 1).padStart(2, "0");
        const key = `${year}-${monthNum}`;
        const label = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        months.push({ key, label });
    }
    return months;
}

analyticsRouter.get("/dashboard-stats", checkAuthenticateUser, async (request, response) => {
    try {
        const role = request.user?.role;
        const userEmail = request.user?.email;

        if (!role || !userEmail) {
            return sendAPIResponse(response, null, false, 401, "Unauthorized user");
        }

        const months = getLast6Months();

        if (role === "admin") {
            // 1. Total counts
            const totalUsers = await user.countDocuments();
            const totalEquipment = await equipment.countDocuments();
            const totalBookings = await bookings.countDocuments();
            const pendingApprovals = await equipment.countDocuments({
                status: { $regex: /^pending$/i },
            });
            const completedRentals = await bookings.countDocuments({
                $or: [
                    { bookingStatus: "Completed" },
                    { paymentStatus: "Paid", bookingStatus: "Confirmed" },
                ],
            });

            // 2. Revenue calculation from confirmed paid payments (avoiding double counting)
            const revenueAgg = await payments.aggregate([
                { $match: { paymentStatus: "Paid" } },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]).toArray();

            let totalRevenue = revenueAgg[0]?.total || 0;

            // If payments collection has no entries yet, fallback to paid bookings
            if (totalRevenue === 0) {
                const bookingRevenueAgg = await bookings.aggregate([
                    { $match: { paymentStatus: "Paid" } },
                    { $group: { _id: null, total: { $sum: "$totalPay" } } },
                ]).toArray();
                totalRevenue = bookingRevenueAgg[0]?.total || 0;
            }

            // 3. Monthly revenue & monthly bookings for last 6 months
            const allPaidBookings = await bookings.find({ paymentStatus: "Paid" }).toArray();
            const allBookingsList = await bookings.find().toArray();

            const monthlyRevenue = months.map(({ key, label }) => {
                const revenue = allPaidBookings
                    .filter((b) => {
                        const d = b.createdAt ? new Date(b.createdAt) : null;
                        if (!d || isNaN(d.getTime())) return false;
                        const bKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        return bKey === key;
                    })
                    .reduce((sum, b) => sum + (Number(b.totalPay) || 0), 0);
                return { month: label, revenue };
            });

            const monthlyBookings = months.map(({ key, label }) => {
                const count = allBookingsList.filter((b) => {
                    const d = b.createdAt ? new Date(b.createdAt) : null;
                    if (!d || isNaN(d.getTime())) return false;
                    const bKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return bKey === key;
                }).length;
                return { month: label, bookings: count };
            });

            // 4. Equipment category distribution
            const categoryAgg = await equipment.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]).toArray();

            const categoryDistribution = categoryAgg.map((item) => ({
                category: item._id || "Other",
                count: item.count,
            }));

            // 5. Equipment approval status distribution
            const approvedCount = await equipment.countDocuments({ status: { $regex: /^approved$/i } });
            const pendingCount = pendingApprovals;
            const rejectedCount = await equipment.countDocuments({ status: { $regex: /^rejected$/i } });

            const statusDistribution = [
                { status: "Approved", count: approvedCount },
                { status: "Pending", count: pendingCount },
                { status: "Rejected", count: rejectedCount },
            ];

            return sendAPIResponse(
                response,
                {
                    role: "admin",
                    overview: {
                        totalUsers,
                        totalEquipment,
                        totalBookings,
                        pendingApprovals,
                        completedRentals,
                        totalRevenue,
                    },
                    charts: {
                        monthlyRevenue,
                        monthlyBookings,
                        categoryDistribution,
                        statusDistribution,
                    },
                },
                true,
                200,
                "Admin dashboard analytics fetched successfully"
            );
        } else if (role === "owner") {
            // Find owner's equipment
            const ownerEquipments = await equipment.find({ creatorEmail: userEmail }).toArray();
            const ownerEquipIds = ownerEquipments.map((e) => e._id);

            const totalEquipment = ownerEquipments.length;
            const approvedEquipment = ownerEquipments.filter(
                (e) => e.status?.toLowerCase() === "approved"
            ).length;
            const rejectedEquipment = ownerEquipments.filter(
                (e) => e.status?.toLowerCase() === "rejected"
            ).length;
            const pendingEquipment = totalEquipment - approvedEquipment - rejectedEquipment;

            // Find bookings for owner's equipment
            const ownerBookings = ownerEquipIds.length > 0
                ? await bookings.find({ equipmentId: { $in: ownerEquipIds } }).toArray()
                : [];

            const totalRentalsReceived = ownerBookings.length;
            const completedRentals = ownerBookings.filter(
                (b) => b.bookingStatus === "Completed" || (b.paymentStatus === "Paid" && b.bookingStatus === "Confirmed")
            ).length;
            const activeBookings = ownerBookings.filter(
                (b) => b.paymentStatus === "Paid" && b.bookingStatus === "Confirmed"
            ).length;
            const pendingBookings = ownerBookings.filter(
                (b) => b.bookingStatus === "Pending"
            ).length;

            // Earnings strictly from Paid bookings
            const paidBookings = ownerBookings.filter((b) => b.paymentStatus === "Paid");
            const totalEarnings = paidBookings.reduce(
                (sum, b) => sum + (Number(b.totalPay) || 0),
                0
            );

            // Monthly earnings and monthly rentals
            const monthlyEarnings = months.map(({ key, label }) => {
                const earnings = paidBookings
                    .filter((b) => {
                        const d = b.createdAt ? new Date(b.createdAt) : null;
                        if (!d || isNaN(d.getTime())) return false;
                        const bKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                        return bKey === key;
                    })
                    .reduce((sum, b) => sum + (Number(b.totalPay) || 0), 0);
                return { month: label, earnings };
            });

            const monthlyRentals = months.map(({ key, label }) => {
                const count = ownerBookings.filter((b) => {
                    const d = b.createdAt ? new Date(b.createdAt) : null;
                    if (!d || isNaN(d.getTime())) return false;
                    const bKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                    return bKey === key;
                }).length;
                return { month: label, bookings: count };
            });

            const statusDistribution = [
                { status: "Approved", count: approvedEquipment },
                { status: "Pending", count: pendingEquipment },
                { status: "Rejected", count: rejectedEquipment },
            ];

            return sendAPIResponse(
                response,
                {
                    role: "owner",
                    overview: {
                        totalEquipment,
                        approvedEquipment,
                        pendingEquipment,
                        totalRentalsReceived,
                        completedRentals,
                        activeBookings,
                        pendingBookings,
                        totalEarnings,
                    },
                    charts: {
                        monthlyEarnings,
                        monthlyRentals,
                        statusDistribution,
                    },
                },
                true,
                200,
                "Owner dashboard analytics fetched successfully"
            );
        } else {
            // Customer analytics
            const customerBookings = await bookings.find({ userEmail }).toArray();

            const totalRentals = customerBookings.length;
            const activeBookings = customerBookings.filter(
                (b) => b.paymentStatus === "Paid" && b.bookingStatus === "Confirmed"
            ).length;
            const pendingBookings = customerBookings.filter(
                (b) => b.bookingStatus === "Pending"
            ).length;
            const completedRentals = customerBookings.filter(
                (b) => b.bookingStatus === "Completed"
            ).length;

            const totalPaid = customerBookings
                .filter((b) => b.paymentStatus === "Paid")
                .reduce((sum, b) => sum + (Number(b.totalPay) || 0), 0);

            return sendAPIResponse(
                response,
                {
                    role: "customer",
                    overview: {
                        totalRentals,
                        activeBookings,
                        pendingBookings,
                        completedRentals,
                        totalPaid,
                    },
                    charts: null,
                },
                true,
                200,
                "Customer dashboard analytics fetched successfully"
            );
        }
    } catch (error) {
        console.error("Dashboard analytics error:", error);
        return sendAPIResponse(response, null, false, 500, "Failed to load dashboard analytics");
    }
});

export default analyticsRouter;
