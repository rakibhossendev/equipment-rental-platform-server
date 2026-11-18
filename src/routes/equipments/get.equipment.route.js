
import Router from "express";

import { sendAPIResponse } from "../../utils/apiResponse.js";
import { equipment } from "../../config/db.js";

const getEquipmentsRouter = Router();

getEquipmentsRouter.get("/", async (request, response) => {
    try {
        const query = {status: "Approved",};

        const {search,category,rentalType,minPrice,maxPrice,availability,sort,} = request.query;

        // Search by Equipment Name and Location
        if (search) {
            query.$or = [
                { equipmentName: { $regex: search, $options: "i" } },
                { location: { $regex: search, $options: "i" } },
            ];
        }

        // Filter by Category
        if (category) {
            query.category = category;
        }

        // Filter by Rental Type
        if (rentalType) {
            query.rentalType = rentalType;
        }

        // Filter by Price Range
        if (minPrice || maxPrice) {
            query.rentalPrice = {};

            if (minPrice) {
                query.rentalPrice.$gte = Number(minPrice);
            }

            if (maxPrice) {
                query.rentalPrice.$lte = Number(maxPrice);
            }
        }

        // Filter by Availability
        if (availability === "available") {
            query.availableQuantity = { $gt: 0 };
        } else if (availability === "unavailable") {
            query.availableQuantity = { $lte: 0 };
        }

        // Sorting
        let sortQuery = { createdAt: -1 };

        if (sort === "price-asc") {
            sortQuery = { rentalPrice: 1 };
        } else if (sort === "price-desc") {
            sortQuery = { rentalPrice: -1 };
        } else if (sort === "recent") {
            sortQuery = { createdAt: -1 };
        }

        console.log("Query:", query);

        const data = await equipment
            .find(query)
            .sort(sortQuery)
            .toArray();

        return sendAPIResponse(
            response,
            data,
            true,
            200,
            "Equipment fetched successfully"
        );

    } catch (error) {
        console.log(error);

        return sendAPIResponse(
            response,
            null,
            false,
            error.statusCode || 500,
            error.message || "Internal server error"
        );
    }
});

export default getEquipmentsRouter;
