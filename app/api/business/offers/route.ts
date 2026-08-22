import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { database } from "@/lib/db";

export async function POST(request:Request){
  const {userId}=await auth();
  if(!userId) return Response.json({error:"Unauthorized"},{status:401});
  const f=await request.formData();
  const name=String(f.get("name")||"").trim();
  const original=Number(f.get("originalPrice")); const offer=Number(f.get("offerPrice")); const credit=Number(f.get("credit")); const quantity=Number(f.get("quantity"));
  if(!name||![original,offer,credit,quantity].every(Number.isFinite)||original<0||offer<0||credit<0||quantity<0) return Response.json({error:"Invalid offer"},{status:400});
  const sql=database();
  const businesses=await sql`SELECT id FROM businesses WHERE clerk_user_id=${userId} LIMIT 1`;
  if(!businesses.length) redirect("/business/onboarding");
  await sql`INSERT INTO offers (business_id,name,original_price,offer_price,membership_credit,quantity) VALUES (${businesses[0].id},${name},${original},${offer},${credit},${quantity})`;
  revalidatePath("/business/dashboard"); redirect("/business/dashboard");
}
