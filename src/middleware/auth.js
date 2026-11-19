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

/**
 * Role-based authorization guard.
 * Must run after checkAuthenticateUser (the JWT payload carries the user object, incl. role).
 * Usage: router.get("/", checkAuthenticateUser, requireRole("admin"), handler)
 */
export const requireRole = (...roles) => (request, response, next) => {
    const role = request.user?.role;

    if (!role || !roles.includes(role)) {
        return sendAPIResponse(response, [], false, 403, "Forbidden: insufficient permissions");
    }

    return next();
};