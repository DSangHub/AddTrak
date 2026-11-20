import Link from "next/link";

export default async function BankOnboarding({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return <main className="authShell"><form className="formCard" action="/api/bank/onboard" method="post">
    <Link className="brand" href="/"><span className="mark">BK</span>BankKnit</Link>
    <div className="eyebrow" style={{marginTop:28}}>Institution application</div>
    <h1>Join the verification network</h1>
    <p className="lead" style={{margin:"0 0 28px",fontSize:16}}>BankKnit reviews every institution before it can receive leads or issue badges. Your institution remains responsible for its own CIP, KYC, privacy, security, and account-opening procedures.</p>
    <div className="formGrid">
      <div className="field full"><label>Institution name</label><input name="institutionName" required /></div>
      <div className="field"><label>Institution type</label><select name="institutionType" required><option value="bank">Bank</option><option value="credit_union">Credit union</option></select></div>
      <div className="field"><label>Plan</label><select name="plan" defaultValue={plan === "premium" ? "premium" : "standard"} required><option value="standard">Standard — $125 per accepted lead</option><option value="premium">Premium — $250 per confirmed account opened</option></select></div>
      <div className="field"><label>Contact name</label><input name="contactName" required /></div>
      <div className="field"><label>Business email</label><input name="email" type="email" required /></div>
      <div className="field"><label>Phone</label><input name="phone" type="tel" /></div>
      <div className="field"><label>Institution website</label><input name="website" type="url" required /></div>
      <div className="field"><label>Primary service ZIP</label><input name="serviceZip" inputMode="numeric" pattern="[0-9]{5}" required /></div>
      <div className="field"><label>Service range</label><select name="serviceRadiusMiles"><option value="10">10 miles</option><option value="25">25 miles</option><option value="50">50 miles</option><option value="75">75 miles</option><option value="100">100 miles maximum</option></select></div>
      <div className="field"><label>Primary regulator</label><input name="regulatorName" placeholder="FDIC, NCUA, OCC, state regulator" required /></div>
      <div className="field"><label>Certificate or charter number</label><input name="certificateNumber" required /></div>
      <div className="field full"><label>Online application URL (required for Premium)</label><input name="onlineApplicationUrl" type="url" /></div>
      <label className="checkField field full"><input name="institutionAttestation" type="checkbox" required /><span>I certify that I am authorized to register this institution, the information is accurate, and the institution—not BankKnit—will perform identity verification using its approved procedures. I agree to the selected fee: $125 for each Standard lead accepted or $250 for each Premium account confirmed opened.</span></label>
    </div>
    <div style={{display:"flex",gap:12,marginTop:24}}><button className="btn primary" type="submit">Submit institution application</button><Link className="btn secondary" href="/">Cancel</Link></div>
  </form></main>;
}
