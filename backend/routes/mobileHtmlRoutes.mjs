import { Router } from "express";
import { serveMobileHtml } from "../controllers/mobileHtmlController.mjs";

const router = Router();

// This will serve the HTML page at /mobile
router.get("/", serveMobileHtml);

export default router;
