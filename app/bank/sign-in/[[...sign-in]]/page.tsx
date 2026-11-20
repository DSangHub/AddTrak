import { SignIn } from "@clerk/nextjs";

export default function BankSignInPage() {
  return <main className="authShell"><SignIn forceRedirectUrl="/bank/dashboard" signUpUrl="/bank/sign-up" /></main>;
}
