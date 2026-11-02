import { auth } from "@clerk/nextjs/server";
import { database } from "@/lib/db";
import { applicationUrl, checkoutIdentifier, stripeClient } from "@/lib/stripe";

type Business = { id: number; name: string; email: string; stripe_customer_id: string | null };

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const priceId = process.env.STRIPE_BUSINESS_PRICE_ID;
  if (!priceId) return Response.json({ error: "Business billing is not configured" }, { status: 503 });
  const sql = database();
  const businesses = await sql`SELECT id,name,email,stripe_customer_id FROM businesses WHERE clerk_user_id=${userId} LIMIT 1` as Business[];
  if (!businesses.length) return Response.redirect(new URL("/business/onboarding", request.url), 303);
  const business = businesses[0];
  const stripe = stripeClient();
  let customerId = business.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ name: business.name, email: business.email });
    customerId = customer.id;
    await sql`UPDATE businesses SET stripe_customer_id=${customerId},updated_at=NOW() WHERE id=${business.id}`;
  }
  const appUrl = applicationUrl(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: String(business.id),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/business/dashboard?billing=success`,
    cancel_url: `${appUrl}/business/dashboard?billing=cancelled`,
    integration_identifier: checkoutIdentifier(),
  });
  if (!session.url) return Response.json({ error: "Stripe Checkout did not return a URL" }, { status: 502 });
  return Response.redirect(session.url, 303);
}
