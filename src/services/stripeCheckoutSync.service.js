import stripe from "../config/stripe.js";
import Subscription from "../models/subscription.model.js";

export const syncStripeCheckoutSession = async ({
  sessionId,
  organizationId,
}) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });

  if (session.mode !== "subscription") {
    throw new Error("Stripe Checkout session is not a subscription session.");
  }

  if (session.payment_status !== "paid") {
    throw new Error("Stripe Checkout payment has not been completed.");
  }

  const stripeSubscription = session.subscription;

  if (!stripeSubscription) {
    throw new Error("Stripe subscription was not found.");
  }

  const price = stripeSubscription.items.data[0]?.price;

  const quantity = stripeSubscription.items.data[0]?.quantity || 1;

  if (!price) {
    throw new Error("Stripe subscription price was not found.");
  }

  const plan =
    session.metadata?.plan || stripeSubscription.metadata?.plan || "standard";

  const billingCycle =
    session.metadata?.billingCycle ||
    stripeSubscription.metadata?.billingCycle ||
    (price.recurring?.interval === "year" ? "annual" : "monthly");

  const subscription = await Subscription.findOneAndUpdate(
    {
      organization: organizationId,
    },
    {
      $set: {
        stripeCustomerId:
          typeof session.customer === "string"
            ? session.customer
            : session.customer.id,

        stripeSubscriptionId: stripeSubscription.id,

        stripePriceId: price.id,

        quantity,

        plan,

        billingCycle,

        status:
          stripeSubscription.status === "active"
            ? "active"
            : stripeSubscription.status,

        startsAt: stripeSubscription.start_date
          ? new Date(stripeSubscription.start_date * 1000)
          : new Date(),

        expiresAt: stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : undefined,
      },
    },
    {
      new: true,
      upsert: true,
    },
  );

  return {
    session,
    stripeSubscription,
    subscription,
  };
};
