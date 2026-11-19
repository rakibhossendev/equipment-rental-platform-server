import { jwtVerify, createRemoteJWKSet } from "jose";
import { env } from "../config/env.js";
import { sendAPIResponse } from "../utils/apiResponse.js";

const JWKS = createRemoteJWKSet(new URL(`${env.CLIENT_SIDE_BASE_URL}/api/auth/jwks`));

export const checkAuthenticateUser = async (request, response, next) => {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        return sendAPIResponse(response, [], false, 401, "Missing or invalid Authorization header");
    }

    const token = authorization.slice(7);

    try {
        const { payload } = await jwtVerify(token, JWKS);
        request.user = payload;
        console.log("JWT verified successfully");
        return next();

    } catch (error) {
        console.error("JWT verification error:", error.message);
        return sendAPIResponse(response, [], false, 401, "Invalid or expired token");
    }
};