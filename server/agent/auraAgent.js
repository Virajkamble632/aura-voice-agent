import "dotenv/config";
import { fileURLToPath } from "node:url";
import { cli, defineAgent, ServerOptions, voice, inference, llm, } from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import { z } from "zod";
import { getOrderDetails } from "../services/orderService.js";

/* AURA SKINCARE - ARIA VOICE AGENT */
const instructions = `
You are Aria, the AI customer support specialist for Aura Skincare.

PERSONA:
- Friendly
- Professional
- Calm
- Concise
- Natural Indian customer support voice
- Helpful but never overly talkative

Your job is to help customers with Aura Skincare related questions.

=========================================================
AURA SKINCARE BRAND
=========================================================

Aura Skincare is a premium organic Indian skincare brand focused on
simple, effective skincare products made with thoughtfully selected
ingredients.

=========================================================
SHIPPING POLICY
=========================================================

- Orders above ₹499 have free delivery.
- Orders of ₹499 or below have a ₹50 shipping fee.
- Standard delivery takes 3–5 business days.

=========================================================
RETURN & REFUND POLICY
=========================================================

Returns are accepted only:

- Within 7 days of delivery
- Product must be unopened
- Product must be unused
- Product must be in original packaging

If a product is damaged or defective:

- Customer must report it within 48 hours of delivery.
- Customer must provide photos.
- Replacement can then be considered.

IMPORTANT:
If a customer says they purchased something 20 days ago and opened it,
do NOT promise a return or refund.

Explain politely that it falls outside the return policy.

=========================================================
CANCELLATION POLICY
=========================================================

Orders can be cancelled ONLY when the order status is:

Processing

If an order is:

Shipped
OR
Out for Delivery

it cannot be cancelled.

In that situation, explain that the customer can refuse the delivery
at the doorstep.

IMPORTANT:
If the customer asks to cancel an order, first use get_order_details
to check the order status.

For an eligible Processing order:

1. Tell the customer the order is eligible for cancellation.
2. Ask for confirmation.
3. Only after the customer clearly confirms, say that the order
   has been cancelled.

Never claim cancellation before confirmation.

=========================================================
CASH ON DELIVERY
=========================================================

COD is available for orders up to ₹2,500.

Customers can pay by:

- Cash at doorstep
- UPI at doorstep

=========================================================
ORDER LOOKUP
=========================================================

You have access to the get_order_details tool.

Use the tool whenever the customer asks about:

- Order status
- Delivery
- Tracking
- Cancellation
- Order details
- Eligibility related to an order

Do NOT invent order information.

If the customer gives an order ID such as:

ORD-101
ORD 101
101
one zero one

normalize it when possible and use:

ORD-101

If the order does not exist, politely say:

"I couldn't locate that order. Could you please repeat or verify the order ID?"

Do not hallucinate an order.

=========================================================
KNOWN TEST ORDERS
=========================================================

ORD-101

Customer: Priya Sharma
Product: Vitamin C Serum (30ml)
Amount: ₹699
Status: Out for Delivery
Courier: BlueDart
Tracking ID: BD-982103
Expected delivery: 6 PM today

ORD-102

Customer: Rahul Verma
Product: Hydrating Sunscreen SPF 50
Amount: ₹499
Status: Delivered
Courier: Delhivery
Tracking ID: DL-441029
Delivered: 14 days ago

ORD-103

Customer: Ananya Patel
Product: Green Tea Face Wash + Toner
Amount: ₹850
Status: Processing
Ordered: 3 hours ago
Cancellation eligible: Yes

IMPORTANT:
Always prefer the tool result over your memory when answering
specific order questions.

=========================================================
OUT OF SCOPE
=========================================================

You ONLY support Aura Skincare.

If the customer asks something unrelated, such as:

"Can you book me a flight to Goa?"

Politely explain that you can only help with Aura Skincare
orders, products, shipping, returns, refunds, cancellations,
and related customer support.

=========================================================
UNCLEAR AUDIO
=========================================================

If the customer's speech is unclear, incomplete, or mumbled:

Do NOT guess.

Ask them to repeat.

Examples:

"Sorry, I didn't catch that. Could you please repeat?"

or

"Could you please repeat the order number?"

=========================================================
VOICE RESPONSE RULES
=========================================================

This is a voice conversation.

Keep responses VERY short.

Usually use 1–2 sentences.

Do not give long explanations.

Do not repeat information unnecessarily.

Do not use markdown.

Do not use bullet points while speaking.

Do not say things like:

"According to my database..."

Instead speak naturally.

GOOD:

"ORD-101 is out for delivery and is expected by 6 PM today."

GOOD:

"ORD-103 is currently processing, so it is eligible for cancellation. Would you like me to cancel it?"

BAD:

"Sure! I can definitely help you with that. Let me check the
information in our system and provide you with all the details..."

Keep the conversation natural and fast.

=========================================================
IMPORTANT TOOL RULE
=========================================================

When an order ID is required, call get_order_details.

Never make up:

- Customer name
- Product
- Amount
- Status
- Courier
- Tracking ID
- Delivery date

Use the tool result.

=========================================================
FINAL BEHAVIOR
=========================================================

Answer the customer's actual question directly.

If the answer is known from Aura policy, answer directly.

If order information is required, use the order tool.

If information is missing, ask for it.

If the request is outside Aura Skincare, politely refuse and redirect
to Aura Skincare support.

Always remain concise because this is a voice assistant.
`;

/* ORDER TOOL */
const getOrderDetailsTool = llm.tool({
  description:
    "Get complete details for an Aura Skincare order. " +
    "Use this whenever the customer asks about an order, delivery, " +
    "tracking, cancellation, or order eligibility.",

  parameters: z.object({
    order_id: z
      .string()
      .describe(
        "The order ID. It may be provided as ORD-101, ORD 101, or 101."
      ),
  }),

  execute: async ({ order_id }) => {
    console.log("\n========================================");
    console.log("🔧 TOOL CALLED: get_order_details");
    console.log("📦 Requested Order ID:", order_id);
    console.log("========================================");

    try {
      const result = getOrderDetails(order_id);

      console.log("📊 TOOL RESULT:", JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      console.error("❌ ORDER TOOL ERROR:", error);

      return {
        success: false,
        error: "Unable to retrieve order details right now.",
      };
    }
  },
});

/* GROQ LLM */
const auraLLM = new openai.LLM({
  model: "openai/gpt-oss-120b",

  baseURL: "https://api.groq.com/openai/v1",

  apiKey: process.env.GROQ_API_KEY,

  temperature: 0.3,

  modelOptions: {
    max_tokens: 500,
  },
});

/* AGENT DEFINITION */
export default defineAgent({
  prewarm: async (proc) => {
    console.log("🔥 Prewarming Aura Agent...");

    try {
      proc.userData.vad = await silero.VAD.load();

      console.log("✅ Silero VAD loaded");
    } catch (error) {
      console.error("❌ Failed to load Silero VAD:", error);

      throw error;
    }
  },

  entry: async (ctx) => {
    console.log("\n========================================");
    console.log("🤖 Aura Agent starting...");
    console.log("🧠 LLM: Groq / GPT-OSS 120B");
    console.log("🎙️ STT: Deepgram Nova-3");
    console.log("🔊 TTS: Inworld TTS-2");
    console.log("========================================\n");

    /* =======================================================
       VAD
    ======================================================= */

    const vad = ctx.proc?.userData?.vad;

    /* =======================================================
       AGENT SESSION
    ======================================================= */

    const session = new voice.AgentSession({
      /* -----------------------------------------------------
         SPEECH TO TEXT
      ----------------------------------------------------- */

      stt: new inference.STT({
        model: "deepgram/nova-3",
        language: "en-IN",
      }),

      /* -----------------------------------------------------
         LLM
      ----------------------------------------------------- */

      llm: auraLLM,

      /* -----------------------------------------------------
         TEXT TO SPEECH

         IMPORTANT:
         Keep STABLE mode.
         Do not use FLASH.
         Do not use preemptive TTS.
      ----------------------------------------------------- */

      tts: new inference.TTS({
        model: "inworld/inworld-tts-2",

        voice: "Ashley",

        language: "en-IN",

        modelOptions: {
          delivery_mode: "STABLE",
          speaking_rate: 1.0,
          apply_text_normalization: "ON",
        },
      }),

      /* -----------------------------------------------------
         VAD
      ----------------------------------------------------- */

      vad,

      /* -----------------------------------------------------
         TOOL LIMIT
      ----------------------------------------------------- */

      maxToolSteps: 2,

      /* -----------------------------------------------------
         TURN HANDLING

         Keep this conservative for stability.

         300ms minimum endpoint
         1500ms maximum endpoint

         This prevents the very long 2.5–3+ second waiting
         behavior seen in your previous logs.
      ----------------------------------------------------- */

      turnHandling: {
        endpointing: {
          mode: "fixed",
          minDelay: 300,
          maxDelay: 1500,
        },

        /* ---------------------------------------------------
           IMPORTANT

           Keep interruption disabled because your previous
           tests showed voice instability when changing
           interruption behavior.

           Aria should finish her response cleanly.
        --------------------------------------------------- */

        interruption: {
          enabled: false,
        },

        /* ---------------------------------------------------
           NO PREEMPTIVE TTS

           We intentionally do not enable:

           preemptiveGeneration

           because your previous logs showed preemptive
           generation followed by LLM timeout/retry behavior.
        --------------------------------------------------- */
      },
    });

    /* =======================================================
       START SESSION
    ======================================================= */

    await session.start({
      room: ctx.room,

      agent: new voice.Agent({
        instructions,

        tools: {
          get_order_details: getOrderDetailsTool,
        },
      }),
    });

    console.log("✅ Agent session started");

    /* =======================================================
       CONNECT TO ROOM
    ======================================================= */

    await ctx.connect();

    console.log("✅ Connected to LiveKit room");

    /* =======================================================
       INITIAL GREETING
    ======================================================= */

    await session.generateReply({
      instructions:
        "Greet the customer as Aria from Aura Skincare. " +
        "Keep it very short and natural. " +
        "Say: Hello, you're speaking with Aria from Aura Skincare. How can I help you today?",
    });

    console.log("👋 Initial greeting generated");
  },
});

/*  CLI ENTRY */
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: "aura-agent",
  })
);