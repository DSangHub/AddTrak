import Stripe from "stripe";
import { database } from "@/lib/db";
import { stripeClient } from "@/lib/stripe";

function id(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id || null;
}

async function markCustomer(customerId: string | null, status: string) {
  if (!customerId) return;
  const sql = database();
  await sql`UPDATE businesses SET billing_status=${status},updated_at=NOW() WHERE stripe_customer_id=${customerId}`;
}

async function customerFromCharge(chargeRef: string | Stripe.Charge | null) {
  if (!chargeRef) return null;
  const charge = typeof chargeRef === "string" ? await stripeClient().charges.retrieve(chargeRef) : chargeRef;
  return id(charge.customer as string | { id: string } | null);
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
  const existing = await sql`SELECT stripe_event_id FROM stripe_webhook_events WHERE stripe_event_id=${event.id} LIMIT 1`;
  if (existing.length) return Response.json({ received: true, duplicate: true });

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
        await sql`UPDATE businesses SET stripe_customer_id=COALESCE(stripe_customer_id,${id(session.customer)}),stripe_subscription_id=${id(session.subscription)},billing_status='active',updated_at=NOW() WHERE stripe_customer_id=${id(session.customer)} OR id=${Number(session.client_reference_id || 0)}`;
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await sql`UPDATE businesses SET stripe_subscription_id=${subscription.id},billing_status=${subscription.status},current_period_end=${periodEnd ? new Date(periodEnd * 1000).toISOString() : null},updated_at=NOW() WHERE stripe_customer_id=${id(subscription.customer)}`;
      break;
    }
    case "invoice.paid":
      await markCustomer(id((event.data.object as Stripe.Invoice).customer), "active");
      break;
    case "invoice.payment_failed":
      await markCustomer(id((event.data.object as Stripe.Invoice).customer), "past_due");
      break;
    case "customer.updated": {
      const customer = event.data.object as Stripe.Customer;
      if (customer.email) await sql`UPDATE businesses SET email=${customer.email},updated_at=NOW() WHERE stripe_customer_id=${customer.id}`;
      break;
    }
    case "charge.refunded":
      await markCustomer(id((event.data.object as Stripe.Charge).customer), "refund_review");
      break;
    case "charge.dispute.created":
      await markCustomer(await customerFromCharge((event.data.object as Stripe.Dispute).charge), "dispute_review");
      break;
    case "radar.early_fraud_warning.created":
      await markCustomer(await customerFromCharge((event.data.object as Stripe.Radar.EarlyFraudWarning).charge), "fraud_review");
      break;
  }
  await sql`INSERT INTO stripe_webhook_events (stripe_event_id,event_type) VALUES (${event.id},${event.type}) ON CONFLICT (stripe_event_id) DO NOTHING`;
  return Response.json({ received: true });
}
