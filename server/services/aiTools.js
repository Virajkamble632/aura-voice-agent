export const tools = [
    {
        type: "function",

        name: "get_order_details",

        description: "Get the current details of an Aura Skincare order using its orderID. Use this when the customer ask about order status, delivery, courier, tracking, cancellation eligibility, or other order-specific information.",

        parameters: {
            type: "object",

            properties:{
                order_id: {
                    type: "string",
                    description: "The Aura Skincare orderID, for example ORD-101",
                },
            },

            required: ["order_id"],
        },
    },
];