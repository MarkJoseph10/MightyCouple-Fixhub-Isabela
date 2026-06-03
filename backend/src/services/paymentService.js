import Stripe from "stripe";
import { env } from "../config/env.js";

const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

export async function createPaymentIntent({ amount, orderId, email }) {
  if (!stripe) {
    return {
      clientSecret: `mock_client_secret_${orderId}`,
      provider: "stripe-mock",
      message: "Stripe secret key not configured. Using sandbox placeholder response."
    };
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "php",
    metadata: {
      orderId,
      email
    },
    automatic_payment_methods: {
      enabled: true
    }
  });

  return {
    clientSecret: paymentIntent.client_secret,
    provider: "stripe",
    message: "Stripe payment intent created"
  };
}

