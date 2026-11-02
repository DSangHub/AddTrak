import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const firstName = String(form.get("firstName") || "").trim();
  const lastName = String(form.get("lastName") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const zip = String(form.get("zip") || "").trim();
  const preferredLanguage = String(form.get("preferredLanguage") || "en") === "es" ? "es" : "en";
  if (!firstName || !lastName || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{5}$/.test(zip)) {
    return Response.json({ error: "Required member information is incomplete" }, { status: 400 });
  }
  const sql = database();
  await sql`INSERT INTO member_profiles (clerk_user_id,first_name,last_name,email,phone,zip,preferred_language) VALUES (${userId},${firstName},${lastName},${email},${phone},${zip},${preferredLanguage}) ON CONFLICT (clerk_user_id) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,email=EXCLUDED.email,phone=EXCLUDED.phone,zip=EXCLUDED.zip,preferred_language=EXCLUDED.preferred_language,updated_at=NOW()`;
  redirect("/member/dashboard");
}
