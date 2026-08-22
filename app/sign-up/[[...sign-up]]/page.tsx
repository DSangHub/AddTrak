import { SignUp } from "@clerk/nextjs";
export default function SignUpPage(){return <main className="authShell"><SignUp forceRedirectUrl="/business/onboarding" /></main>}
