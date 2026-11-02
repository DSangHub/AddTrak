import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const membershipId = Number(form.get("membershipId"));
  const merchant = String(form.get("merchantName") || "").trim();
  const amount = Number(form.get("amount"));
  const purchasedAt = String(form.get("purchasedAt") || "").trim();
  const receiptReference = String(form.get("receiptReference") || "").trim();
  if (!Number.isInteger(membershipId) || !merchant || !Number.isFinite(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(purchasedAt)) return Response.json({ error: "Invalid purchase" }, { status: 400 });
  const sql = database();
  const members = await sql`SELECT id FROM member_profiles WHERE clerk_user_id=${userId} LIMIT 1`;
  if (!members.length) redirect("/member/onboarding");
  const memberships = await sql`SELECT id FROM member_memberships WHERE id=${membershipId} AND member_id=${members[0].id} LIMIT 1`;
  if (!memberships.length) return Response.json({ error: "Membership not found" }, { status: 404 });
  await sql`INSERT INTO purchases (member_id,membership_id,merchant_name,amount,purchased_at,receipt_reference) VALUES (${members[0].id},${membershipId},${merchant},${amount},${purchasedAt},${receiptReference})`;
  revalidatePath("/member/dashboard");
  redirect("/member/dashboard");
}
