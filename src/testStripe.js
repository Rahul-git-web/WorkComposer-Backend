import "dotenv/config";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

try {
    const products = await stripe.products.list({
        limit: 1,
    });

} catch (error) {
    console.error("STRIPE AUTH FAILED");
    console.error("Status:", error.statusCode);
    console.error("Message:", error.message);
}