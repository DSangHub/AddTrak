import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { backendConfigured, database } from "@/lib/db";
import { applicationUrl } from "@/lib/stripe";

type Member = { id: number; first_name: string; last_name: string; zip: string; public_slug: string; verification_status: string };
type Bank = { id: number; institution_name: string; institution_type: string; service_zip: string; service_radius_miles: number; plan: string; online_application_url: string | null };
type Verification = { id: number; institution_name: string; status: string; created_at: string };
type Badge = { status: string; issued_at: string; expires_at: string; institution_name: string };

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export default async function MemberDashboard() {
  const { userId } = await auth();
  if (!userId) redirect("/member/sign-in");
  if (!backendConfigured()) return <main className="authShell"><div className="formCard"><h1>Member dashboard is ready for connection</h1><div className="notice">Connect Clerk and Postgres, then apply db/schema.sql.</div><Link className="btn primary" href="/">Return home</Link></div></main>;
  const sql = database();
  const members = await sql`SELECT id,first_name,last_name,zip,public_slug,verification_status FROM bankknit.member_profiles WHERE clerk_user_id=${userId} LIMIT 1` as Member[];
  if (!members.length) redirect("/member/onboarding");
  const member = members[0];
  const banks = await sql`SELECT id,institution_name,institution_type,service_zip,service_radius_miles,plan,online_application_url FROM bankknit.bank_profiles WHERE status='approved' AND (service_zip=${member.zip} OR LEFT(service_zip,3)=LEFT(${member.zip},3)) ORDER BY CASE WHEN service_zip=${member.zip} THEN 0 ELSE 1 END,institution_name LIMIT 30` as Bank[];
  const requests = await sql`SELECT vr.id,b.institution_name,vr.status,vr.created_at FROM bankknit.verification_requests vr JOIN bankknit.bank_profiles b ON b.id=vr.bank_id WHERE vr.member_id=${member.id} ORDER BY vr.created_at DESC` as Verification[];
  const badges = await sql`SELECT v.status,v.issued_at,v.expires_at,b.institution_name FROM bankknit.verified_name_badges v JOIN bankknit.bank_profiles b ON b.id=v.bank_id WHERE v.member_id=${member.id} LIMIT 1` as Badge[];
  const badge = badges[0];
  const publicUrl = `${applicationUrl()}/verify/${member.public_slug}`;
  return <main className="dash">
    <header className="dashHead"><div className="wrap dashTitle"><Link className="brand" href="/"><span className="mark">BK</span>BankKnit</Link><UserButton /></div></header>
    <div className="wrap dashMain">
      <div className="eyebrow">Verified Name Profile</div><h1>{member.first_name} {member.last_name}</h1>
      <div className="stats"><div className="stat"><span>Profile status</span><strong className="badgeStatus"><i className="dot" />{member.verification_status.replaceAll("_", " ")}</strong></div><div className="stat"><span>Home ZIP</span><strong>{member.zip}</strong></div><div className="stat"><span>Verification requests</span><strong>{requests.length}</strong></div></div>
      {badge ? <section className="card"><div className="eyebrow">Bank-issued badge</div><h2>{badge.status === "active" ? "Your badge is ready to share" : `Badge ${badge.status}`}</h2><p>Issued by {badge.institution_name} on {date(badge.issued_at)} · Valid through {date(badge.expires_at)}</p><Link className="badgeLink" href={`/verify/${member.public_slug}`}>{publicUrl}</Link><p style={{marginTop:14}}>Use this public link on marketplace profiles, social accounts, listings, invoices, and email signatures.</p></section> : <div className="notice">You do not have a bank-issued badge yet. Select an approved institution below to request verification.</div>}
      <div className="proposal" style={{marginTop:30,alignItems:"start"}}>
        <section className="card"><h2>Find a participating institution</h2><p>These are ZIP-area matches. Each institution declares its service range; BankKnit does not calculate road distance or guarantee eligibility.</p>{banks.length ? <div className="offerList">{banks.map(bank => <div className="offerRow" style={{gridTemplateColumns:"1.4fr 1fr"}} key={bank.id}><div><strong>{bank.institution_name}</strong><div style={{color:"var(--muted)",marginTop:5,textTransform:"capitalize"}}>{bank.institution_type.replace("_", " ")} · {bank.service_radius_miles}-mile declared range · {bank.plan}</div></div><form action="/api/verification/request" method="post"><input type="hidden" name="bankId" value={bank.id} /><label className="checkField" style={{fontSize:13,marginBottom:9}}><input name="consent" type="checkbox" required /><span>Send my profile and contact details</span></label><button className="btn primary" type="submit">Request verification</button>{bank.plan === "premium" && bank.online_application_url ? <a className="btn secondary" style={{marginTop:8}} href={bank.online_application_url} target="_blank" rel="noreferrer">Online application</a> : null}</form></div>)}</div> : <div className="empty">No approved institutions currently match ZIP {member.zip}. More institutions can join the network.</div>}</section>
        <section className="card"><h2>Your requests</h2>{requests.length ? <div className="offerList">{requests.map(item => <div className="offerRow" style={{gridTemplateColumns:"1.4fr 1fr"}} key={item.id}><div><strong>{item.institution_name}</strong><div style={{color:"var(--muted)",marginTop:5}}>Requested {date(item.created_at)}</div></div><span className="badgeStatus"><i className="dot" />{item.status.replaceAll("_", " ")}</span></div>)}</div> : <div className="empty">No verification requests yet.</div>}</section>
      </div>
      <div className="notice" style={{marginTop:30}}>Never send an ID, SSN, bank login, account number, or identity document through BankKnit. Your selected institution will tell you how to complete its verification using its own secure process.</div>
    </div>
  </main>;
}
