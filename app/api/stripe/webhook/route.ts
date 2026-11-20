import Stripe from "stripe";
import { database } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

function id(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

async function setPaymentReview(paymentIntentId: string | null, status: string) {
  if (!paymentIntentId) return;
  const sql = database();
  await sql`UPDATE bankknit.bank_billing_events SET status=${status},updated_at=NOW() WHERE stripe_payment_intent_id=${paymentIntentId}`;
}

async function chargeFromReference(reference: string | Stripe.Charge | null) {
  if (!reference) return null;
  return typeof reference === "string" ? stripeClient().charges.retrieve(reference) : reference;
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
  const sql = database();
  const existing = await sql`SELECT stripe_event_id FROM bankknit.stripe_webhook_events WHERE stripe_event_id=${event.id} LIMIT 1`;
  if (existing.length) return Response.json({ received: true, duplicate: true });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const billingId = Number(session.client_reference_id || session.metadata?.bankknit_billing_event_id || 0);
      if (Number.isSafeInteger(billingId) && billingId > 0 && (session.payment_status === "paid" || session.payment_status === "no_payment_required")) {
        await sql`UPDATE bankknit.bank_billing_events SET status='paid',stripe_checkout_session_id=${session.id},stripe_payment_intent_id=${id(session.payment_intent)},paid_at=NOW(),updated_at=NOW() WHERE id=${billingId}`;
      }
      break;
    }
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const billingId = Number(session.client_reference_id || session.metadata?.bankknit_billing_event_id || 0);
      if (Number.isSafeInteger(billingId) && billingId > 0) await sql`UPDATE bankknit.bank_billing_events SET status='failed',stripe_checkout_session_id=${session.id},stripe_payment_intent_id=${id(session.payment_intent)},updated_at=NOW() WHERE id=${billingId}`;
      break;
    }
    case "customer.updated": {
      const customer = event.data.object as Stripe.Customer;
      if (customer.email) await sql`UPDATE bankknit.bank_profiles SET email=${customer.email},updated_at=NOW() WHERE stripe_customer_id=${customer.id}`;
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      await setPaymentReview(id(charge.payment_intent), "refund_review");
      break;
    }
    case "charge.dispute.created": {
      const charge = await chargeFromReference((event.data.object as Stripe.Dispute).charge);
      await setPaymentReview(charge ? id(charge.payment_intent) : null, "dispute_review");
      break;
    }
    case "radar.early_fraud_warning.created": {
      const charge = await chargeFromReference((event.data.object as Stripe.Radar.EarlyFraudWarning).charge);
      await setPaymentReview(charge ? id(charge.payment_intent) : null, "fraud_review");
      break;
    }
  }
  await sql`INSERT INTO bankknit.stripe_webhook_events (stripe_event_id,event_type) VALUES (${event.id},${event.type}) ON CONFLICT (stripe_event_id) DO NOTHING`;
  return Response.json({ received: true });
}
