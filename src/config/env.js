import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Points directly to equipment-rental-platform-server/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DATABASE_URL = process.env.MONGODB_DATABASE_URL;
const PORT = process.env.PORT || 5000;
const CLIENT_SIDE_BASE_URL = process.env.CLIENT_SIDE_BASE_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

if (!DATABASE_URL) {
    console.log("Env not found");
}

export const env = {
    DATABASE_URL: DATABASE_URL,
    PORT: PORT,
    CLIENT_SIDE_BASE_URL: CLIENT_SIDE_BASE_URL,
    STRIPE_SECRET_KEY: STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: STRIPE_PUBLISHABLE_KEY, 
    STRIPE_WEBHOOK_SECRET: STRIPE_WEBHOOK_SECRET, 
};
