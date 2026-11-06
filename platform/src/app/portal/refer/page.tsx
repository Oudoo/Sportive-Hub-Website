import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReferralCard } from "@/components/portal/ReferralCard";
import { Badge, Card, Empty, Stat } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getReferPageData } from "@/lib/services/portal";

export const metadata: Metadata = { title: "Refer a friend" };

export default async function ReferPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal/refer");
  const data = await getReferPageData(user);

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Refer a friend</h1>
      <p className="mt-2 max-w-2xl text-olive">
        Share your code. Your friend gets {data.welcomePoints} welcome points, and you get {data.referralPoints} points{" "}
        {data.trigger === "FIRST_SESSION" ? "once they attend their first session" : "as soon as they sign up"}. No limit on how many friends you invite.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Your code">
          {data.code && data.link && data.message ? (
            <ReferralCard code={data.code} link={data.link} message={data.message} />
          ) : (
            <Empty>Referral codes are for patient accounts.</Empty>
          )}
        </Card>

        <Card title="How it works">
          <ol className="grid gap-3 text-sm">
            <li className="flex gap-3">
              <span className="font-serif text-2xl italic leading-none text-sand">1</span>
              <span>Send your link on WhatsApp, or read out your code at the clinic.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-serif text-2xl italic leading-none text-sand">2</span>
              <span>Your friend creates an account with it and gets {data.welcomePoints} points to start.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-serif text-2xl italic leading-none text-sand">3</span>
              <span>
                {data.trigger === "FIRST_SESSION" ? "After their first session, " : "Right away, "}
                {data.referralPoints} points land in your account. Spend them on rewards.
              </span>
            </li>
          </ol>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Link opened" value={data.clicks} hint="Times your link was opened" />
        <Stat label="Friends joined" value={data.signups} hint={`${data.qualified} qualified`} />
        <Stat label="Points earned" value={data.pointsEarned} hint="From referrals so far" />
      </div>

      <Card title="Your friends" className="mt-6">
        {data.friends.length === 0 ? (
          <Empty>No one has joined with your code yet. Share it with someone who would like a good physio.</Empty>
        ) : (
          <ul className="grid gap-2 text-sm">
            {data.friends.map((friend) => (
              <li key={friend.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10 pb-2 last:border-0">
                <span>
                  {friend.firstName} <span className="text-olive">· joined {formatDate(friend.joinedAt)}</span>
                </span>
                <Badge tone={friend.qualifiedAt ? "good" : "warn"}>{friend.qualifiedAt ? `+${data.referralPoints} points` : "Waiting for their first session"}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
