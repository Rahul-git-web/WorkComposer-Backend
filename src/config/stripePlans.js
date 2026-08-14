export const STRIPE_PLANS = {
    standard: {
        name: "WorkComposer Standard",
        description:
            "Everything you need to manage your team and projects.",

        productId: "prod_V2tLG8UUczYBER",

        monthly: {
            priceId: "price_1U2nZ4C5wb23RDwBsOkDHg6n",
            amount: 99900,
            currency: "inr",
            interval: "month",
        },

        annual: {
            priceId: "price_1U2nefC5wb23RDwB1K2nibin",
            amount: 898800,
            currency: "inr",
            interval: "year",
        },
    },

    premium: {
        name: "WorkComposer Premium",
        description:
            "Advanced productivity insights and automation.",

        productId: "prod_V2tRhRZsIsqbv1",

        monthly: {
            priceId: "price_1U2negC5wb23RDwBPCunOE3K",
            amount: 199900,
            currency: "inr",
            interval: "month",
        },

        annual: {
            priceId: "price_1U2negC5wb23RDwBN7uspEgu",
            amount: 1798800,
            currency: "inr",
            interval: "year",
        },
    },
};