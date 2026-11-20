import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const institutionName = String(form.get("institutionName") || "").trim();
  const institutionType = form.get("institutionType") === "credit_union" ? "credit_union" : "bank";
  const contactName = String(form.get("contactName") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const website = String(form.get("website") || "").trim();
  const regulatorName = String(form.get("regulatorName") || "").trim();
  const certificateNumber = String(form.get("certificateNumber") || "").trim();
  const serviceZip = String(form.get("serviceZip") || "").trim();
  const serviceRadiusMiles = Math.min(100, Math.max(1, Number(form.get("serviceRadiusMiles") || 25)));
  const plan = form.get("plan") === "premium" ? "premium" : "standard";
  const onlineApplicationUrl = String(form.get("onlineApplicationUrl") || "").trim();
  const attested = form.get("institutionAttestation") === "on";
  if (!institutionName || !contactName || !/^\S+@\S+\.\S+$/.test(email) || !/^https?:\/\//.test(website) || !regulatorName || !certificateNumber || !/^\d{5}$/.test(serviceZip) || !Number.isFinite(serviceRadiusMiles) || !attested || (plan === "premium" && !/^https?:\/\//.test(onlineApplicationUrl))) return Response.json({ error: "Institution application is incomplete" }, { status: 400 });
  const sql = database();
  await sql`INSERT INTO bankknit.bank_profiles (clerk_user_id,institution_name,institution_type,contact_name,email,phone,website,regulator_name,certificate_number,service_zip,service_radius_miles,plan,online_application_url) VALUES (${userId},${institutionName},${institutionType},${contactName},${email},${phone},${website},${regulatorName},${certificateNumber},${serviceZip},${serviceRadiusMiles},${plan},${onlineApplicationUrl || null}) ON CONFLICT (clerk_user_id) DO UPDATE SET institution_name=EXCLUDED.institution_name,institution_type=EXCLUDED.institution_type,contact_name=EXCLUDED.contact_name,email=EXCLUDED.email,phone=EXCLUDED.phone,website=EXCLUDED.website,regulator_name=EXCLUDED.regulator_name,certificate_number=EXCLUDED.certificate_number,service_zip=EXCLUDED.service_zip,service_radius_miles=EXCLUDED.service_radius_miles,plan=EXCLUDED.plan,online_application_url=EXCLUDED.online_application_url,updated_at=NOW()`;
  redirect("/bank/dashboard");
}
