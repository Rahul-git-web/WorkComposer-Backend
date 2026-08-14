import stripe from "../config/stripe.js";

export const handleStripeWebhook = async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (error) {
        console.error(
            "STRIPE WEBHOOK SIGNATURE ERROR:",
            error.message
        );

        return res.status(400).send(
            `Webhook Error: ${error.message}`
        );
    }

    console.log(
        "STRIPE WEBHOOK RECEIVED:",
        event.type
    );

    switch (event.type) {
        case "checkout.session.completed":
            console.log(
                "CHECKOUT COMPLETED:",
                event.data.object.id
            );
            break;

        default:
            console.log(
                "Unhandled Stripe event:",
                event.type
            );
    }

    return res.status(200).json({
        received: true,
    });
};