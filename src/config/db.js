import { env } from "./env.js";
import { MongoClient } from "mongodb";

export const DB_NAME = "equipment-rental-platform-db";

const client = new MongoClient(env.DATABASE_URL);
let database = client.db(DB_NAME);

export async function connectToDb() {
    try {
        await client.connect();
        database = client.db(DB_NAME);
        return database;
    } catch (error) {
        console.error(error);
    }
}

// Collections
export const equipment = database.collection("equipments");
export const user = database.collection("user");
