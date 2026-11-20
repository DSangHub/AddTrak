import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

type Member = { id: number };
type Bank = { id: number };

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const bankId = Number(form.get("bankId"));
  if (!Number.isSafeInteger(bankId) || bankId < 1 || form.get("consent") !== "on") return Response.json({ error: "Select a bank and consent to sharing your profile" }, { status: 400 });
  const sql = database();
  const members = await sql`SELECT id FROM bankknit.member_profiles WHERE clerk_user_id=${userId} AND public_name_consent_at IS NOT NULL LIMIT 1` as Member[];
  if (!members.length) redirect("/member/onboarding");
  const banks = await sql`SELECT id FROM bankknit.bank_profiles WHERE id=${bankId} AND status='approved' LIMIT 1` as Bank[];
  if (!banks.length) return Response.json({ error: "Institution is not approved to receive requests" }, { status: 409 });
  const memberId = members[0].id;
  await sql`INSERT INTO bankknit.verification_requests (member_id,bank_id,status,consent_at) VALUES (${memberId},${bankId},'submitted',NOW()) ON CONFLICT (member_id,bank_id) DO UPDATE SET status=CASE WHEN verification_requests.status IN ('rejected','expired','revoked') THEN 'submitted' ELSE verification_requests.status END,consent_at=NOW(),updated_at=NOW()`;
  await sql`UPDATE bankknit.member_profiles SET verification_status='requested',updated_at=NOW() WHERE id=${memberId} AND verification_status!='verified'`;
  redirect("/member/dashboard?request=submitted");
}
