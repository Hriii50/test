import assert from "node:assert/strict";
import test from "node:test";
import { ObjectId } from "mongodb";
import { createMizanApiHandler } from "../src/index.ts";

function createBillingFixture() {
  const userId = new ObjectId().toHexString();
  const user = {
    _id: new ObjectId(userId),
    name: "Mizan Test",
    email: "billing-test@example.invalid",
  };
  const payments = new Map();
  let checkoutParameters;
  let currentUserId = userId;
  let stripeEvent = {
    type: "checkout.session.completed",
    data: { object: null },
  };
  const session = {
    id: "cs_test_0123456789abcdef",
    mode: "payment",
    status: "complete",
    payment_status: "paid",
    amount_total: 12900,
    currency: "kwd",
    payment_intent: "pi_test_0123456789",
    metadata: {
      mizanApp: "mizan",
      userId,
      priceId: "price_test_mizan",
    },
    client_reference_id: userId,
  };
  stripeEvent.data.object = session;

  const database = {
    collection(name) {
      if (name === "users") {
        return {
          findOne: async ({ _id }) => _id.equals(user._id) ? user : null,
        };
      }
      if (name === "payments") {
        return {
          updateOne: async (filter, update) => {
            if (!payments.has(filter.stripeSessionId)) {
              payments.set(filter.stripeSessionId, update.$setOnInsert);
            }
            return { acknowledged: true, upsertedCount: 1 };
          },
        };
      }
      assert.fail(`Unexpected collection requested: ${name}`);
    },
  };

  const stripe = {
    prices: {
      retrieve: async (id) => ({
        id,
        active: true,
        type: "one_time",
        unit_amount: 12900,
        currency: "kwd",
        product: {
          id: "prod_test_mizan",
          name: "MIZAN One-Time Access",
          description: "One-time payment",
          deleted: false,
        },
      }),
    },
    products: { retrieve: async () => assert.fail("Price product should be expanded") },
    checkout: {
      sessions: {
        create: async (params) => {
          checkoutParameters = params;
          return { id: session.id, url: "https://checkout.stripe.com/c/pay/test" };
        },
        retrieve: async () => session,
      },
    },
    webhooks: {
      constructEvent: (_payload, signature, secret) => {
        assert.equal(secret, "whsec_test_value_not_a_credential");
        if (signature !== "sig_test_valid") throw new Error("invalid signature");
        return stripeEvent;
      },
    },
  };

  const handler = createMizanApiHandler({
    getDatabase: async () => database,
    getSessionUserId: async () => ({ userId: currentUserId, invalid: false }),
    getStripeGateway: () => stripe,
    getStripePriceId: () => "price_test_mizan",
    getStripeWebhookSecret: () => "whsec_test_value_not_a_credential",
  });

  return {
    handler,
    userId,
    payments,
    session,
    setSessionUserId(id) { currentUserId = id; },
    setStripeEvent(event) { stripeEvent = event; },
    getCheckoutParameters() { return checkoutParameters; },
  };
}

test("billing checkout uses the server-configured one-time price and authenticated user", async () => {
  const fixture = createBillingFixture();
  const priceResponse = await fixture.handler(new Request("https://mizan.example/api/billing/price", {
    headers: { cookie: "mizan_session=test" },
  }));
  assert.equal(priceResponse.status, 200);
  assert.deepEqual(await priceResponse.json(), {
    name: "MIZAN One-Time Access",
    description: "One-time payment",
    amount: 12900,
    currency: "KWD",
  });

  const checkoutResponse = await fixture.handler(new Request("https://mizan.example/api/billing/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://mizan.example",
      "x-forwarded-host": "mizan.example",
      "x-forwarded-proto": "https",
      cookie: "mizan_session=test",
    },
    body: JSON.stringify({}),
  }));

  assert.equal(checkoutResponse.status, 200);
  assert.deepEqual(await checkoutResponse.json(), {
    url: "https://checkout.stripe.com/c/pay/test",
  });
  const parameters = fixture.getCheckoutParameters();
  assert.equal(parameters.mode, "payment");
  assert.deepEqual(parameters.line_items, [{ price: "price_test_mizan", quantity: 1 }]);
  assert.equal(parameters.metadata.userId, fixture.userId);
  assert.match(parameters.success_url, /^https:\/\/mizan\.example\/payment\?session_id=/);
  assert.equal(parameters.cancel_url, "https://mizan.example/payment?canceled=1");
});

test("billing confirmation verifies ownership, and signed webhook writes one idempotent payment", async () => {
  const fixture = createBillingFixture();
  fixture.setSessionUserId(new ObjectId().toHexString());
  const otherUserResponse = await fixture.handler(new Request(
    `https://mizan.example/api/billing/session?session_id=${fixture.session.id}`,
    { headers: { cookie: "mizan_session=test" } },
  ));
  assert.equal(otherUserResponse.status, 404);

  fixture.setSessionUserId(fixture.session.metadata.userId);
  const confirmation = await fixture.handler(new Request(
    `https://mizan.example/api/billing/session?session_id=${fixture.session.id}`,
    { headers: { cookie: "mizan_session=test" } },
  ));

  assert.equal(confirmation.status, 200);
  assert.deepEqual(await confirmation.json(), {
    status: "paid",
    amount: 12900,
    currency: "KWD",
  });
  assert.equal(fixture.payments.size, 1);

  const webhookRequest = () => new Request("https://mizan.example/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "sig_test_valid",
    },
    body: JSON.stringify({ id: "evt_test_123" }),
  });

  const firstWebhook = await fixture.handler(webhookRequest());
  const secondWebhook = await fixture.handler(webhookRequest());
  assert.equal(firstWebhook.status, 200);
  assert.equal(secondWebhook.status, 200);
  assert.equal(fixture.payments.size, 1);
  assert.equal([...fixture.payments.values()][0].stripeSessionId, fixture.session.id);
});

test("billing rejects cross-origin checkout and invalid Stripe signatures", async () => {
  const fixture = createBillingFixture();
  const crossOrigin = await fixture.handler(new Request("https://mizan.example/api/billing/checkout", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://attacker.example",
      "x-forwarded-host": "mizan.example",
      "x-forwarded-proto": "https",
      cookie: "mizan_session=test",
    },
    body: JSON.stringify({}),
  }));
  assert.equal(crossOrigin.status, 403);
  assert.equal(fixture.getCheckoutParameters(), undefined);

  const invalidSignature = await fixture.handler(new Request("https://mizan.example/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "sig_test_invalid",
    },
    body: JSON.stringify({ id: "evt_test_invalid" }),
  }));
  assert.equal(invalidSignature.status, 400);
  assert.equal(fixture.payments.size, 0);
});
