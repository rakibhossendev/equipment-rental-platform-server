import app from "./app.js";
import { connectToDb } from "./config/db.js";
import { env } from "./config/env.js";

async function startServer() {
    try {
        await connectToDb();
        console.log("MongoDB connected successfully");
        
        // Pass env.PORT as the first argument here
        app.listen(env.PORT, () => {
            console.log(`Express server running on port ${env.PORT}`);
        });
    } catch (error) {
        console.log(error);
    }
}

await startServer();
