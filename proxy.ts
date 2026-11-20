import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const protectedRoute = createRouteMatcher([
  "/member/dashboard(.*)",
  "/member/onboarding(.*)",
  "/bank/dashboard(.*)",
  "/bank/onboarding(.*)",
  "/api/member(.*)",
  "/api/bank(.*)",
  "/api/verification(.*)",
  "/api/stripe/checkout(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (protectedRoute(request)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)", "/(api)(.*)"],
};
