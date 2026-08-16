import stripe from "../config/stripe.js";
import BillingProfile from "../models/billingProfile.model.js";

export const getOrCreateStripeCustomer = async ({
  organizationId,
  existingCustomerId,
}) => {
  const organizationObjectId = organizationId?._id || organizationId;

  if (!organizationObjectId) {
    throw new Error("Organization ID is required to create Stripe customer.");
  }
  // If we already have a Stripe customer,
  // reuse it.
  if (existingCustomerId) {
    return await stripe.customers.retrieve(existingCustomerId);
  }

  const billingProfile = await BillingProfile.findOne({
    organization: organizationObjectId,
  });

  const customer = await stripe.customers.create({
    name:
      billingProfile?.companyName ||
      `WorkComposer Organization ${organizationId}`,

    email: billingProfile?.email || undefined,

    address: billingProfile
      ? {
          line1: billingProfile.address || undefined,
          city: billingProfile.city || undefined,
          state: billingProfile.state || undefined,
          postal_code: billingProfile.postalCode || undefined,
          country: billingProfile.country || undefined,
        }
      : undefined,

    metadata: {
      organizationId: organizationObjectId.toString(),
    },
  });

  return customer;
};
