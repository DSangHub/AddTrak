import { auth } from "@clerk/nextjs/server";
import { database } from "@/lib/db";
import { applicationUrl, stripeClient } from "@/lib/stripe";

type Business = { stripe_customer_id: string | null };

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const sql = database();
  const businesses = await sql`SELECT stripe_customer_id FROM businesses WHERE clerk_user_id=${userId} LIMIT 1` as Business[];
  const customerId = businesses[0]?.stripe_customer_id;
  if (!customerId) return Response.json({ error: "No Stripe customer is connected" }, { status: 404 });
  const session = await stripeClient().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${applicationUrl(request)}/business/dashboard`,
  });
  return Response.redirect(session.url, 303);
}
