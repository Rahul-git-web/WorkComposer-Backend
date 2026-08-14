import stripe from "../config/stripe.js";
import { STRIPE_PLANS } from "../config/stripePlans.js";
import { getOrganizationSeatCount } from "./billingSeat.service.js";
import { getOrCreateStripeCustomer } from "./stripeCustomer.service.js";

export const createStripeCheckoutSession = async ({
  organizationId,
  plan,
  billingCycle,
}) => {
  const planConfig = STRIPE_PLANS[plan];

  if (!planConfig) {
    throw new Error(`Invalid billing plan: ${plan}`);
  }

  const priceConfig = planConfig[billingCycle];

  if (!priceConfig) {
    throw new Error(`Invalid billing cycle: ${billingCycle}`);
  }

  const customer = await getOrCreateStripeCustomer({
    organizationId,
  });

  const quantity = await getOrganizationSeatCount(organizationId);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",

    customer: customer.id,

    line_items: [
      {
        price: priceConfig.priceId,
        quantity,
      },
    ],

    subscription_data: {
      metadata: {
        organizationId: organizationId.toString(),

        plan,

        billingCycle,

        quantity: quantity.toString(),
      },
    },

    success_url:
      `${process.env.FRONTEND_URL}` +
      "/dashboard/settings/account/billings" +
      "?checkout=success&session_id={CHECKOUT_SESSION_ID}",

    cancel_url:
      `${process.env.FRONTEND_URL}` +
      "/dashboard/settings/account/billings" +
      "?checkout=cancelled",

    metadata: {
      organizationId: organizationId.toString(),

      plan,

      billingCycle,

      quantity: quantity.toString(),
    },
  });

  return {
    session,
    customer,
    quantity,
    priceId: priceConfig.priceId,
  };
};
