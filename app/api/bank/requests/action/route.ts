import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

type RequestRow = { id: number; member_id: number; bank_id: number; status: string; plan: string; bank_status: string; first_name: string; last_name: string };

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const requestId = Number(form.get("requestId"));
  const action = String(form.get("action") || "");
  if (!Number.isSafeInteger(requestId) || !["accept","reject","verify","account_opened","revoke"].includes(action)) return Response.json({ error: "Invalid request action" }, { status: 400 });
  const sql = database();
  const rows = await sql`SELECT vr.id,vr.member_id,vr.bank_id,vr.status,b.plan,b.status AS bank_status,m.first_name,m.last_name FROM bankknit.verification_requests vr JOIN bankknit.bank_profiles b ON b.id=vr.bank_id JOIN bankknit.member_profiles m ON m.id=vr.member_id WHERE vr.id=${requestId} AND b.clerk_user_id=${userId} LIMIT 1` as RequestRow[];
  if (!rows.length) return Response.json({ error: "Verification request not found" }, { status: 404 });
  const item = rows[0];
  if (item.bank_status !== "approved") return Response.json({ error: "Institution approval is required" }, { status: 403 });

  if (action === "accept") {
    if (item.status !== "submitted") return Response.json({ error: "Only submitted requests can be accepted" }, { status: 409 });
    await sql`UPDATE bankknit.verification_requests SET status='accepted',accepted_at=NOW(),updated_at=NOW() WHERE id=${requestId} AND status='submitted'`;
    if (item.plan === "standard") await sql`INSERT INTO bankknit.bank_billing_events (bank_id,verification_request_id,fee_type,amount_cents) VALUES (${item.bank_id},${requestId},'qualified_lead',12500) ON CONFLICT (verification_request_id,fee_type) DO NOTHING`;
  }
  if (action === "reject") {
    if (!["submitted","accepted","verification_pending"].includes(item.status)) return Response.json({ error: "This request can no longer be rejected" }, { status: 409 });
    await sql`UPDATE bankknit.verification_requests SET status='rejected',updated_at=NOW() WHERE id=${requestId}`;
    await sql`UPDATE bankknit.member_profiles SET verification_status='unverified',updated_at=NOW() WHERE id=${item.member_id} AND verification_status!='verified'`;
  }
  if (action === "verify") {
    if (!["accepted","verification_pending"].includes(item.status)) return Response.json({ error: "Accept the request before issuing a badge" }, { status: 409 });
    const badgeCode = `BK-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const publicName = `${item.first_name} ${item.last_name}`;
    await sql`UPDATE bankknit.verification_requests SET status='verified',verified_at=NOW(),expires_at=NOW()+INTERVAL '1 year',updated_at=NOW() WHERE id=${requestId}`;
    await sql`INSERT INTO bankknit.verified_name_badges (member_id,bank_id,verification_request_id,badge_code,public_name,status,issued_at,expires_at,revoked_at) VALUES (${item.member_id},${item.bank_id},${requestId},${badgeCode},${publicName},'active',NOW(),NOW()+INTERVAL '1 year',NULL) ON CONFLICT (member_id) DO UPDATE SET bank_id=EXCLUDED.bank_id,verification_request_id=EXCLUDED.verification_request_id,badge_code=EXCLUDED.badge_code,public_name=EXCLUDED.public_name,status='active',issued_at=NOW(),expires_at=NOW()+INTERVAL '1 year',revoked_at=NULL,updated_at=NOW()`;
    await sql`UPDATE bankknit.member_profiles SET verification_status='verified',updated_at=NOW() WHERE id=${item.member_id}`;
  }
  if (action === "account_opened") {
    if (item.plan !== "premium" || item.status !== "verified") return Response.json({ error: "Issue the verified-name badge before confirming the account opened" }, { status: 409 });
    await sql`UPDATE bankknit.verification_requests SET status='account_opened',account_opened_at=NOW(),updated_at=NOW() WHERE id=${requestId}`;
    await sql`INSERT INTO bankknit.bank_billing_events (bank_id,verification_request_id,fee_type,amount_cents) VALUES (${item.bank_id},${requestId},'opened_account',25000) ON CONFLICT (verification_request_id,fee_type) DO NOTHING`;
  }
  if (action === "revoke") {
    if (!["verified","account_opened"].includes(item.status)) return Response.json({ error: "No active badge to revoke" }, { status: 409 });
    await sql`UPDATE bankknit.verification_requests SET status='revoked',updated_at=NOW() WHERE id=${requestId}`;
    await sql`UPDATE bankknit.verified_name_badges SET status='revoked',revoked_at=NOW(),updated_at=NOW() WHERE verification_request_id=${requestId}`;
    await sql`UPDATE bankknit.member_profiles SET verification_status='revoked',updated_at=NOW() WHERE id=${item.member_id}`;
  }
  redirect("/bank/dashboard");
}
