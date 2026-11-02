import { SignUp } from "@clerk/nextjs";

export default function MemberSignUpPage() {
  return <main className="authShell"><SignUp forceRedirectUrl="/member/onboarding" signInUrl="/member/sign-in" /></main>;
}
