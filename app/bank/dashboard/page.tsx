import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { backendConfigured, database } from "@/lib/db";

type Bank = { id: number; institution_name: string; plan: string; status: string; service_zip: string; service_radius_miles: number };
type Lead = { id: number; first_name: string; last_name: string; email: string; phone: string | null; zip: string; status: string; created_at: string };
type Billing = { id: number; fee_type: string; amount_cents: number; status: string; created_at: string; first_name: string; last_name: string };

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

export default async function BankDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/bank/sign-in");
  if (!backendConfigured()) return <main className="authShell"><div className="formCard"><h1>Institution dashboard is ready for connection</h1><div className="notice">Connect Clerk and Postgres, then apply db/schema.sql.</div><Link className="btn primary" href="/">Return home</Link></div></main>;
  const sql = database();
  const banks = await sql`SELECT id,institution_name,plan,status,service_zip,service_radius_miles FROM bankknit.bank_profiles WHERE clerk_user_id=${userId} LIMIT 1` as Bank[];
  if (!banks.length) redirect("/bank/onboarding");
  const bank = banks[0];
  const leads = await sql`SELECT vr.id,m.first_name,m.last_name,m.email,m.phone,m.zip,vr.status,vr.created_at FROM bankknit.verification_requests vr JOIN bankknit.member_profiles m ON m.id=vr.member_id WHERE vr.bank_id=${bank.id} ORDER BY vr.created_at DESC LIMIT 100` as Lead[];
  const billing = await sql`SELECT be.id,be.fee_type,be.amount_cents,be.status,be.created_at,m.first_name,m.last_name FROM bankknit.bank_billing_events be JOIN bankknit.verification_requests vr ON vr.id=be.verification_request_id JOIN bankknit.member_profiles m ON m.id=vr.member_id WHERE be.bank_id=${bank.id} ORDER BY be.created_at DESC LIMIT 100` as Billing[];
  const due = billing.filter(item => ["due", "failed"].includes(item.status)).reduce((sum, item) => sum + item.amount_cents, 0);
  return <main className="dash">
    <header className="dashHead"><div className="wrap dashTitle"><Link className="brand" href="/"><span className="mark">BK</span>BankKnit for Institutions</Link><UserButton /></div></header>
    <div className="wrap dashMain"><div className="eyebrow">Institution dashboard</div><h1>{bank.institution_name}</h1>
      {bank.status !== "approved" ? <div className="notice"><strong>Application {bank.status.replaceAll("_", " ")}.</strong> BankKnit must review the institution and registration details before this account can receive leads or issue badges.</div> : <div className="success">Approved institution · You may receive consented leads and issue Verified Name Profile badges.</div>}
      <div className="stats"><div className="stat"><span>Plan</span><strong style={{textTransform:"capitalize"}}>{bank.plan}</strong></div><div className="stat"><span>Service area</span><strong>{bank.service_zip} · {bank.service_radius_miles} mi</strong></div><div className="stat"><span>Fees due</span><strong>${(due / 100).toFixed(2)}</strong></div></div>
      <section><h2>Verification requests</h2><p className="lead" style={{margin:"0 0 20px"}}>Use your institution’s approved secure process to verify the customer. Do not ask the customer to upload identity documents to BankKnit.</p>{leads.length ? <div className="offerList">{leads.map(lead => <article className="card" key={lead.id}><div className="offerRow" style={{border:0,padding:0,boxShadow:"none"}}><div><strong>{lead.first_name} {lead.last_name}</strong><div style={{color:"var(--muted)",marginTop:5}}>{lead.email} · {lead.phone || "No phone"} · ZIP {lead.zip}</div></div><span>Requested {date(lead.created_at)}</span><span className="badgeStatus"><i className="dot" />{lead.status.replaceAll("_", " ")}</span><div className="actions" style={{flexWrap:"wrap"}}>{lead.status === "submitted" ? <><Action id={lead.id} action="accept" label="Accept lead" primary /><Action id={lead.id} action="reject" label="Reject" /></> : null}{["accepted","verification_pending"].includes(lead.status) ? <><Action id={lead.id} action="verify" label="Issue badge" primary /><Action id={lead.id} action="reject" label="Reject" /></> : null}{bank.plan === "premium" && ["accepted","verification_pending","verified"].includes(lead.status) ? <Action id={lead.id} action="account_opened" label="Confirm account opened" /> : null}{["verified","account_opened"].includes(lead.status) ? <Action id={lead.id} action="revoke" label="Revoke badge" /> : null}</div></div></article>)}</div> : <div className="empty">No verification requests yet.</div>}</section>
      <section style={{marginTop:40}}><h2>Billing ledger</h2><p>Standard: $125 when a qualified lead is accepted. Premium: $250 only when an account is confirmed opened.</p>{billing.length ? <div className="offerList">{billing.map(item => <div className="offerRow" key={item.id}><strong>{item.first_name} {item.last_name}</strong><span>{item.fee_type.replaceAll("_", " ")}</span><span>${(item.amount_cents / 100).toFixed(2)} · {item.status}</span>{["due", "failed"].includes(item.status) ? <form action="/api/stripe/checkout" method="post"><input type="hidden" name="billingEventId" value={item.id} /><button className="btn primary" type="submit">Pay securely</button></form> : <span>{date(item.created_at)}</span>}</div>)}</div> : <div className="empty">No billable events yet.</div>}</section>
      <div className="notice" style={{marginTop:30}}>BankKnit records the institution’s verification decision and badge status only. Your institution remains responsible for CIP/KYC, privacy, information security, fair lending, consumer disclosures, account eligibility, and recordkeeping.</div>
    </div>
  </main>;
}

function Action({ id, action, label, primary = false }: { id: number; action: string; label: string; primary?: boolean }) {
  return <form action="/api/bank/requests/action" method="post"><input type="hidden" name="requestId" value={id} /><input type="hidden" name="action" value={action} /><button className={`btn ${primary ? "primary" : "secondary"}`} type="submit">{label}</button></form>;
}
