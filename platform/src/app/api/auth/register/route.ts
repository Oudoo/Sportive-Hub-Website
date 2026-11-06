import { issueSessionToken, sessionCookie } from "@/lib/auth/session";
import { ok, parseJson, route } from "@/lib/http";
import { referralLink } from "@/lib/referral";
import { registerPatient } from "@/lib/services/auth";
import { registerSchema } from "@/lib/validation";

/**
 * POST /api/auth/register
 * Body: { fullName, email, password, phone?, referralCode? }
 * Creates a patient, pays referral bonuses if a code was given, and signs them in.
 */
export const POST = route(async (request) => {
  const input = await parseJson(request, registerSchema);
  const user = await registerPatient(input);

  const token = await issueSessionToken(user);
  const response = ok(
    {
      user,
      referralLink: user.referralCode ? referralLink(user.referralCode) : null,
      redirectTo: "/portal",
    },
    { status: 201 },
  );
  response.cookies.set(sessionCookie(token));
  return response;
});
