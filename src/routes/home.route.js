import { Router } from "express";
import { verifyRole } from "../middleware/auth.js";


const router = Router();

router.get("/",(request,response) => {
    response.send("<h1>Express server is running..</h1>")
})

export default router