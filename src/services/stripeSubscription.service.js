import stripe from "../config/stripe.js";
import { STRIPE_PLANS } from "../config/stripePlans.js";
import { getOrganizationSeatCount } from "./billingSeat.service.js";
import { getOrCreateStripeCustomer } from "./stripeCustomer.service.js";

export const createStripeSubscription = async ({
  organizationId,
  plan,
  billingCycle,
  existingCustomerId,
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
    existingCustomerId,
  });

  // TEST MODE ONLY
  if (!customer.invoice_settings?.default_payment_method) {
    const paymentMethod = await stripe.paymentMethods.attach("pm_card_visa", {
      customer: customer.id,
    });

    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethod.id,
      },
    });
  }

  const quantity = await getOrganizationSeatCount(organizationId);

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,

    items: [
      {
        price: priceConfig.priceId,
        quantity,
      },
    ],

    metadata: {
      organizationId: organizationId.toString(),
      plan,
      billingCycle,
      quantity: quantity.toString(),
    },
  });

  return {
    subscription,
    customer,
    quantity,
    priceId: priceConfig.priceId,
  };
};

export const updateStripeSubscription = async ({
  stripeSubscriptionId,
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

  if (!stripeSubscriptionId) {
    throw new Error("Stripe subscription ID is required.");
  }

  const quantity = await getOrganizationSeatCount(organizationId);

  // Get the existing Stripe subscription
  const existingSubscription =
    await stripe.subscriptions.retrieve(stripeSubscriptionId);

  if (!existingSubscription) {
    throw new Error("Stripe subscription not found.");
  }

  const subscriptionItem = existingSubscription.items.data[0];

  if (!subscriptionItem) {
    throw new Error("Stripe subscription item not found.");
  }

  // Change the existing subscription price
  const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
    items: [
      {
        id: subscriptionItem.id,
        price: priceConfig.priceId,
        quantity,
      },
    ],

    metadata: {
      organizationId: organizationId.toString(),

      plan,

      billingCycle,

      quantity: quantity.toString(),
    },
  });

  return {
    subscription,
    quantity,
    priceId: priceConfig.priceId,
  };
};
