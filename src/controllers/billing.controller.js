import Subscription from "../models/subscription.model.js";
import BillingProfile from "../models/billingProfile.model.js";
import PaymentMethod from "../models/paymentMethod.model.js";
import Invoice from "../models/invoice.model.js";
import {
  createStripeProduct,
  createStripePrice,
} from "../services/stripePlan.service.js";
import {
  createStripeSubscription,
  updateStripeSubscription,
} from "../services/stripeSubscription.service.js";
import { createStripeCheckoutSession } from "../services/stripeCheckout.service.js";
import { syncStripeCheckoutSession } from "../services/stripeCheckoutSync.service.js";

export const getBillingOverview = async (req, res) => {
  try {
    const organization = req.user.organization;

    const [subscription, billingProfile, paymentMethod] = await Promise.all([
      Subscription.findOne({
        organization,
      }),

      BillingProfile.findOneAndUpdate(
        { organization },
        {
          $setOnInsert: {
            organization,
          },
        },
        {
          new: true,
          upsert: true,
        },
      ),

      PaymentMethod.findOneAndUpdate(
        { organization },
        {
          $setOnInsert: {
            organization,
          },
        },
        {
          new: true,
          upsert: true,
        },
      ),
    ]);

    return res.status(200).json({
      subscription,
      billingProfile,
      paymentMethod,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch billing overview.",
    });
  }
};

export const getSubscription = async (req, res) => {
  try {
    const organization = req.user.organization;

    const subscription = await Subscription.findOne({
      organization,
    });

    return res.status(200).json(subscription);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch subscription.",
    });
  }
};

export const getInvoices = async (req, res) => {
  try {
    const organization = req.user.organization;

    const invoices = await Invoice.find({
      organization,
    }).sort({
      issuedAt: -1,
    });

    return res.status(200).json({
      invoices,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to fetch invoices.",
    });
  }
};

export const updateBillingProfile = async (req, res) => {
  try {
    const organization = req.user.organization;

    const {
      companyName,
      contactName,
      email,
      address,
      city,
      state,
      postalCode,
      country,
      taxId,
    } = req.body;

    const billingProfile = await BillingProfile.findOneAndUpdate(
      { organization },
      {
        $set: {
          companyName,
          contactName,
          email,
          address,
          city,
          state,
          postalCode,
          country,
          taxId,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      },
    );

    return res.status(200).json({
      message: "Billing information updated successfully.",
      billingProfile,
    });
  } catch (error) {
    console.error("UPDATE BILLING PROFILE ERROR:", error);

    return res.status(500).json({
      message: "Failed to update billing information.",
    });
  }
};

export const createCheckoutSession = async (req, res) => {
  try {

    const organizationId = req.user.organization?._id || req.user.organization;

    const { plan, billingCycle } = req.body || {};

    if (!plan || !billingCycle) {
      return res.status(400).json({
        message: "Plan and billing cycle are required.",
      });
    }

    const result = await createStripeCheckoutSession({
      organizationId,
      plan,
      billingCycle,
    });

    return res.status(200).json({
      sessionId: result.session.id,
      checkoutUrl: result.session.url,
    });
  } catch (error) {
    console.error("STRIPE CHECKOUT ERROR:", error);

    return res.status(500).json({
      message: "Failed to create Stripe Checkout session.",
      error: error.message,
    });
  }
};

export const syncCheckoutSession = async (req, res) => {
  try {
    const organizationId = req.user.organization?._id || req.user.organization;

    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({
        message: "Stripe session ID is required.",
      });
    }

    const result = await syncStripeCheckoutSession({
      sessionId,
      organizationId,
    });

    return res.status(200).json({
      message: "Stripe Checkout synced successfully.",
      subscription: result.subscription,
    });
  } catch (error) {
    console.error("STRIPE CHECKOUT SYNC ERROR:", error);

    return res.status(500).json({
      message: "Failed to sync Stripe Checkout session.",
      error: error.message,
    });
  }
};

export const changeStripePlan = async (req, res) => {
  try {
    const organizationId = req.user.organization?._id || req.user.organization;

    const { plan, billingCycle } = req.body || {};

    if (!plan) {
      return res.status(400).json({
        message: "Plan is required.",
      });
    }

    if (!billingCycle) {
      return res.status(400).json({
        message: "Billing cycle is required.",
      });
    }

    // Get the organization's current subscription
    const currentSubscription = await Subscription.findOne({
      organization: organizationId,
    });

    if (!currentSubscription) {
      return res.status(404).json({
        message: "No active subscription found.",
      });
    }

    if (!currentSubscription.stripeSubscriptionId) {
      return res.status(400).json({
        message: "Stripe subscription ID is missing.",
      });
    }

    const result = await updateStripeSubscription({
      stripeSubscriptionId: currentSubscription.stripeSubscriptionId,

      organizationId,

      plan,

      billingCycle,
    });

    // Update MongoDB
    currentSubscription.plan = plan;
    currentSubscription.billingCycle = billingCycle;
    currentSubscription.quantity = result.quantity;
    currentSubscription.stripePriceId = result.priceId;
    currentSubscription.status = result.subscription.status;

    await currentSubscription.save();

    return res.status(200).json({
      message: "Stripe subscription plan updated successfully.",

      subscription: currentSubscription,
    });
  } catch (error) {
    console.error("STRIPE PLAN CHANGE ERROR:", error);

    return res.status(500).json({
      message: "Failed to change Stripe subscription plan.",

      error: error.message,
    });
  }
};
