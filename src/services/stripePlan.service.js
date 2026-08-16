import stripe from "../config/stripe.js";
import { STRIPE_PLANS } from "../config/stripePlans.js";

export const createStripeProduct = async (plan) => {
    const config = STRIPE_PLANS[plan];

    if (!config) {
        throw new Error(`Invalid Stripe plan: ${plan}`);
    }

    const product = await stripe.products.create({
        name: config.name,
        description: config.description,
        metadata: {
            workcomposerPlan: plan,
        },
    });

    return product;
};

export const createStripePrice = async (
    productId,
    plan,
    billingCycle
) => {
    const config = STRIPE_PLANS[plan]?.[billingCycle];

    if (!config) {
        throw new Error(
            `Invalid Stripe billing configuration: ${plan} ${billingCycle}`
        );
    }

    const price = await stripe.prices.create({
        product: productId,
        currency: config.currency,
        unit_amount: config.amount,

        recurring: {
            interval: config.interval,
        },

        metadata: {
            workcomposerPlan: plan,
            billingCycle,
            pricingModel: "per_user",
        },
    });

    return price;
};