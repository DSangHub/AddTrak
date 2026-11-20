import { SignUp } from "@clerk/nextjs";

export default function BankSignUpPage() {
  return <main className="authShell"><SignUp forceRedirectUrl="/bank/onboarding" signInUrl="/bank/sign-in" /></main>;
}
