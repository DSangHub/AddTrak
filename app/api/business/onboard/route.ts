import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

export async function POST(request: Request){
  const {userId}=await auth();
  if(!userId) return Response.json({error:"Unauthorized"},{status:401});
  const form=await request.formData();
  const name=String(form.get("name")||"").trim();
  const ownerName=String(form.get("ownerName")||"").trim();
  const email=String(form.get("email")||"").trim();
  const category=String(form.get("category")||"").trim();
  const city=String(form.get("city")||"").trim();
  const zip=String(form.get("zip")||"").trim();
  if(!name||!ownerName||!email||!category||!city||!/^\d{5}$/.test(zip)) return Response.json({error:"Required business information is incomplete"},{status:400});
  const sql=database();
  await sql`INSERT INTO businesses (clerk_user_id,name,owner_name,email,phone,website,category,city,zip,inventory_problem) VALUES (${userId},${name},${ownerName},${email},${String(form.get("phone")||"")},${String(form.get("website")||"")},${category},${city},${zip},${String(form.get("inventoryProblem")||"")}) ON CONFLICT (clerk_user_id) DO UPDATE SET name=EXCLUDED.name,owner_name=EXCLUDED.owner_name,email=EXCLUDED.email,phone=EXCLUDED.phone,website=EXCLUDED.website,category=EXCLUDED.category,city=EXCLUDED.city,zip=EXCLUDED.zip,inventory_problem=EXCLUDED.inventory_problem,updated_at=NOW()`;
  redirect("/business/dashboard");
}
