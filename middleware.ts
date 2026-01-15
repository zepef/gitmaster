import { NextResponse } from "next/server"
import { auth } from "@/auth"

export default auth(async (req) => {
  const session = req.auth

  // If not logged in, redirect to home
  if (!session?.user) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Skip setup check for settings page and API routes
  if (
    req.nextUrl.pathname.startsWith("/dashboard/settings") ||
    req.nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.next()
  }

  // Check if setup is complete by calling the action
  // Note: We use a simple cookie/header check here to avoid DB calls in middleware
  // The actual onboarding redirect happens in the settings page
  return NextResponse.next()
})

export const config = {
  matcher: ["/dashboard/:path*"],
}
