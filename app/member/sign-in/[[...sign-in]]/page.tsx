import { SignIn } from "@clerk/nextjs";

export default function MemberSignInPage() {
  return <main className="authShell"><SignIn forceRedirectUrl="/member/dashboard" signUpUrl="/member/sign-up" /></main>;
}
