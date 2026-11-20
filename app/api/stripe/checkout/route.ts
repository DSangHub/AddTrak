import { auth } from "@clerk/nextjs/server";
import { database } from "@/lib/db";
import { applicationUrl, checkoutIdentifier, stripeClient } from "@/lib/stripe";

type BillingEvent = { id: number; amount_cents: number; fee_type: string; status: string; bank_id: number; institution_name: string; email: string; stripe_customer_id: string | null };

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const billingEventId = Number(form.get("billingEventId"));
  if (!Number.isSafeInteger(billingEventId) || billingEventId < 1) return Response.json({ error: "Invalid billing event" }, { status: 400 });
  const sql = database();
  const rows = await sql`SELECT be.id,be.amount_cents,be.fee_type,be.status,be.bank_id,b.institution_name,b.email,b.stripe_customer_id FROM bankknit.bank_billing_events be JOIN bankknit.bank_profiles b ON b.id=be.bank_id WHERE be.id=${billingEventId} AND b.clerk_user_id=${userId} LIMIT 1` as BillingEvent[];
  if (!rows.length) return Response.json({ error: "Billing event not found" }, { status: 404 });
  const billing = rows[0];
  if (!["due", "failed"].includes(billing.status)) return Response.json({ error: "This fee is not currently payable" }, { status: 409 });
  const stripe = stripeClient();
  let customerId = billing.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: billing.institution_name, email: billing.email, metadata: { bankknit_bank_id: String(billing.bank_id) } });
    customerId = customer.id;
    await sql`UPDATE bankknit.bank_profiles SET stripe_customer_id=${customerId},updated_at=NOW() WHERE id=${billing.bank_id}`;
  }
  const appUrl = applicationUrl(request);
  const label = billing.fee_type === "opened_account" ? "Premium confirmed account-opened fee" : "Standard accepted qualified-lead fee";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    client_reference_id: String(billing.id),
    line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: billing.amount_cents, product_data: { name: `BankKnit — ${label}`, description: `Fee ledger event ${billing.id}` } } }],
    success_url: `${appUrl}/bank/dashboard?billing=success`,
    cancel_url: `${appUrl}/bank/dashboard?billing=cancelled`,
    metadata: { bankknit_billing_event_id: String(billing.id), bankknit_bank_id: String(billing.bank_id), fee_type: billing.fee_type },
    payment_intent_data: { metadata: { bankknit_billing_event_id: String(billing.id), bankknit_bank_id: String(billing.bank_id) } },
    integration_identifier: checkoutIdentifier(),
  });
  await sql`UPDATE bankknit.bank_billing_events SET stripe_checkout_session_id=${session.id},updated_at=NOW() WHERE id=${billing.id}`;
  if (!session.url) return Response.json({ error: "Stripe Checkout did not return a URL" }, { status: 502 });
  return Response.redirect(session.url, 303);
}
