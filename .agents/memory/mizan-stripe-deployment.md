---
name: MIZAN Stripe setup
description: Durable billing and hosting choices for the MIZAN AI Finance Platform.
---

MIZAN uses one-time Stripe payments and deploys the frontend and backend together on Vercel while keeping the existing MongoDB. Do not replace or migrate MongoDB. The Stripe Price ID is server configuration; the browser must never choose the charge amount or price.

**Why:** The user selected a one-time billing model and Vercel with the existing MongoDB.

**How to apply:** Extend billing using Stripe-hosted Checkout, keep payment verification server-side, and persist verified payment records in MongoDB. Use recurring billing only if the user changes the billing model.
