import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  changeStripePlan,
  createCheckoutSession,
  getBillingOverview,
  getInvoices,
  getSubscription,
  syncCheckoutSession,
  updateBillingProfile,
} from "../controllers/billing.controller.js";

const router = express.Router();

router.get("/overview", protect, getBillingOverview);
router.get("/subscription", protect, getSubscription);
router.get("/invoices", protect, getInvoices);
router.put("/billing-profile", protect, updateBillingProfile);
router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/sync-checkout-session", protect, syncCheckoutSession);
router.post("/change-plan", protect, changeStripePlan);

export default router;
