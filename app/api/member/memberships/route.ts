import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const name = String(form.get("membershipName") || "").trim();
  const annualCost = Number(form.get("annualCost"));
  const renewalDate = String(form.get("renewalDate") || "").trim() || null;
  if (!name || !Number.isFinite(annualCost) || annualCost < 0) return Response.json({ error: "Invalid membership" }, { status: 400 });
  const sql = database();
  const members = await sql`SELECT id FROM member_profiles WHERE clerk_user_id=${userId} LIMIT 1`;
  if (!members.length) redirect("/member/onboarding");
  await sql`INSERT INTO member_memberships (member_id,membership_name,annual_cost,renewal_date) VALUES (${members[0].id},${name},${annualCost},${renewalDate})`;
  revalidatePath("/member/dashboard");
  redirect("/member/dashboard");
}
