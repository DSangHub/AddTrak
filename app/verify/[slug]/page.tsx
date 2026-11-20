import Link from "next/link";
import { notFound } from "next/navigation";
import { backendConfigured, database } from "@/lib/db";

type Profile = { first_name: string; last_name: string; badge_code: string | null; badge_status: string | null; issued_at: string | null; expires_at: string | null; revoked_at: string | null; institution_name: string | null; institution_type: string | null };

function date(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(new Date(value)) : "Not issued";
}

export default async function VerifiedProfile({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!backendConfigured()) notFound();
  const sql = database();
  const rows = await sql`SELECT m.first_name,m.last_name,v.badge_code,v.status AS badge_status,v.issued_at,v.expires_at,v.revoked_at,b.institution_name,b.institution_type FROM bankknit.member_profiles m LEFT JOIN bankknit.verified_name_badges v ON v.member_id=m.id LEFT JOIN bankknit.bank_profiles b ON b.id=v.bank_id WHERE m.public_slug=${slug} AND m.public_name_consent_at IS NOT NULL LIMIT 1` as Profile[];
  if (!rows.length) notFound();
  const profile = rows[0];
  const expired = profile.expires_at ? new Date(profile.expires_at) <= new Date() : false;
  const status = profile.revoked_at ? "revoked" : expired ? "expired" : profile.badge_status || "not verified";
  const active = status === "active";
  return <main className="authShell"><article className="formCard" style={{maxWidth:680}}><Link className="brand" href="/"><span className="mark">BK</span>BankKnit</Link><div className="badgeSeal" style={{marginTop:34}}>{active ? "✓" : "!"}</div><div className="eyebrow">Verified Name Profile</div><h1>{profile.first_name} {profile.last_name}</h1><div className={active ? "success" : "notice"}><strong style={{textTransform:"capitalize"}}>{status}</strong>{active ? " — The issuing institution reports this badge as current." : " — This profile does not currently have an active bank-issued badge."}</div><div className="verifyLine"><span>Issued by</span><strong>{profile.institution_name || "No institution"}</strong></div><div className="verifyLine"><span>Institution type</span><strong style={{textTransform:"capitalize"}}>{profile.institution_type?.replace("_", " ") || "—"}</strong></div><div className="verifyLine"><span>Issued</span><strong>{date(profile.issued_at)}</strong></div><div className="verifyLine"><span>Valid through</span><strong>{date(profile.expires_at)}</strong></div><div className="verifyLine"><span>Badge ID</span><strong>{profile.badge_code || "Not issued"}</strong></div><p style={{color:"var(--muted)",lineHeight:1.6}}>A BankKnit badge confirms only that the named institution issued the displayed name and currently reports the badge status shown. It is not government identification, a credit report, a financial guarantee, or proof that a transaction is safe. Continue to use contracts, secure payments, and normal fraud checks.</p><Link className="btn secondary" href="/">Learn about BankKnit</Link></article></main>;
}
