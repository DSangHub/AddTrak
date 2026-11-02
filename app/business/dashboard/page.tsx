import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { backendConfigured, database } from "@/lib/db";
import { stripeConfigured } from "@/lib/stripe";

type Business = { id: number; name: string; status: string; billing_status: string; stripe_customer_id: string | null };
type Offer = { id: number; name: string; original_price: string; offer_price: string; membership_credit: string; quantity: number; status: string };

export default async function Dashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  if (!backendConfigured()) return <main className="authShell"><div className="formCard"><h1>Business dashboard is ready for connection</h1><div className="notice">Connect Clerk and a Postgres database in Vercel, add the environment variables, and run db/schema.sql once.</div><p>The application code is complete, but live account storage cannot begin until those private services are connected.</p><Link className="btn primary" href="/">Return to proposal</Link></div></main>;
  const sql = database();
  const businesses = await sql`SELECT id,name,status,billing_status,stripe_customer_id FROM businesses WHERE clerk_user_id=${userId} LIMIT 1` as Business[];
  if (!businesses.length) redirect("/business/onboarding");
  const business = businesses[0];
  const offers = await sql`SELECT id,name,original_price,offer_price,membership_credit,quantity,status FROM offers WHERE business_id=${business.id} ORDER BY created_at DESC` as Offer[];
  const units = offers.reduce((total, offer) => total + Number(offer.quantity), 0);
  const credits = offers.reduce((total, offer) => total + Number(offer.membership_credit) * Number(offer.quantity), 0);
  return <main className="dash"><header className="dashHead"><div className="wrap dashTitle"><Link className="brand" href="/"><span className="mark">A</span>AddTrak Business</Link><UserButton /></div></header><div className="wrap dashMain"><div className="eyebrow">Founding business dashboard</div><h1>{business.name}</h1><span className="tag">{business.status}</span><div className="stats"><div className="stat"><span>Offers created</span><strong>{offers.length}</strong></div><div className="stat"><span>Units submitted</span><strong>{units}</strong></div><div className="stat"><span>Potential member credits</span><strong>${credits.toFixed(2)}</strong></div></div><section className="card" style={{marginBottom:28}}><div className="dashTitle"><div><h2 style={{marginTop:0}}>Business billing</h2><p style={{marginBottom:0}}>Status: <strong>{business.billing_status.replaceAll("_", " ")}</strong>. Founding businesses remain free until a paid plan is activated.</p></div>{stripeConfigured() ? business.stripe_customer_id ? <form action="/api/stripe/portal" method="post"><button className="btn secondary" type="submit">Manage billing</button></form> : <form action="/api/stripe/checkout" method="post"><button className="btn primary" type="submit">Activate business plan</button></form> : <span className="tag">Stripe setup pending</span>}</div></section><section className="card"><h2>Add a slow-moving offer</h2><p>Offers remain drafts until AddTrak reviews the founding-business account.</p><form className="offerForm" action="/api/business/offers" method="post"><input name="name" placeholder="Product or service" required /><input name="originalPrice" type="number" min="0" step=".01" placeholder="Regular $" required /><input name="offerPrice" type="number" min="0" step=".01" placeholder="Offer $" required /><input name="credit" type="number" min="0" step=".01" placeholder="Member credit $" required /><input name="quantity" type="number" min="0" step="1" placeholder="Quantity" required /><button className="btn primary" type="submit">Save draft offer</button></form></section><section style={{marginTop:28}}><h2>Your offers</h2>{offers.length ? <div className="offerList">{offers.map(offer => <div className="offerRow" key={offer.id}><strong>{offer.name}</strong><span>${offer.offer_price} offer</span><span>${offer.membership_credit} credit</span><span>{offer.quantity} available · {offer.status}</span></div>)}</div> : <div className="empty">No offers yet. Add the first slow-moving item above.</div>}</section></div></main>;
}
