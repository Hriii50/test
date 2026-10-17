import Stripe from "stripe";
import { ObjectId, type Db } from "mongodb";
import type { PaymentDocument, UserDocument } from "./mongo";

export type StripeGateway = Pick<Stripe, "checkout" | "prices" | "products" | "webhooks">;

export function getStripeGateway(): StripeGateway | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  return secretKey ? new Stripe(secretKey) : null;
}

export function getStripePriceId(): string | null {
  return process.env.STRIPE_PRICE_ID?.trim() || null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || null;
}

export async function getConfiguredPrice(
  stripe: StripeGateway,
  priceId: string,
): Promise<{ name: string; description: string | null; amount: number; currency: string } | null> {
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  if (!price.active || price.type !== "one_time" || price.unit_amount === null || price.unit_amount < 1) {
    return null;
  }

  const product = typeof price.product === "string"
    ? await stripe.products.retrieve(price.product)
    : price.product;

  if (product.deleted) return null;

  return {
    name: product.name,
    description: product.description,
    amount: price.unit_amount,
    currency: price.currency.toUpperCase(),
  };
}

export async function recordPaidCheckout(
  database: Db,
  session: Stripe.Checkout.Session,
  expectedPriceId: string,
): Promise<boolean> {
  if (
    session.mode !== "payment" ||
    session.payment_status !== "paid" ||
    session.metadata?.mizanApp !== "mizan" ||
    session.amount_total === null ||
    session.currency === null
  ) {
    return false;
  }

  const userId = session.metadata.userId;
  const priceId = session.metadata.priceId;
  if (!userId || !ObjectId.isValid(userId) || priceId !== expectedPriceId) return false;

  const user = await database.collection<UserDocument>("users").findOne({
    _id: new ObjectId(userId),
  });
  if (!user) return false;

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
  const payment: PaymentDocument = {
    _id: new ObjectId(),
    userId,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntentId,
    stripePriceId: priceId,
    amount: session.amount_total,
    currency: session.currency.toUpperCase(),
    status: "paid",
    createdAt: new Date().toISOString(),
  };

  try {
    await database.collection<PaymentDocument>("payments").updateOne(
      { stripeSessionId: session.id },
      { $setOnInsert: payment },
      { upsert: true },
    );
  } catch (cause) {
    if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === 11000) {
      return true;
    }
    throw cause;
  }

  return true;
}
