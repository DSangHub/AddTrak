import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const protectedRoute = createRouteMatcher([
  "/business/dashboard(.*)",
  "/business/onboarding(.*)",
  "/member/dashboard(.*)",
  "/member/onboarding(.*)",
  "/api/business(.*)",
  "/api/member(.*)",
  "/api/stripe/checkout(.*)",
  "/api/stripe/portal(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (protectedRoute(request)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|webmanifest)).*)", "/(api)(.*)"],
};
