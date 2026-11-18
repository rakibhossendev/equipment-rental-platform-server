import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Points directly to equipment-rental-platform-server/.env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const DATABASE_URL = process.env.MONGODB_DATABASE_URL;
const PORT = process.env.PORT || 5000;

if (!DATABASE_URL) {
    console.log("Env not found");
}

export const env = {
    DATABASE_URL: DATABASE_URL,
    PORT: PORT,
};
