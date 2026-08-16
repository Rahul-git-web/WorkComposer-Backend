import express from "express";
import { handleStripeWebhook } from "../controllers/stripeWebhook.controller.js";

const router = express.Router();

router.post(
    "/",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
);

export default router;