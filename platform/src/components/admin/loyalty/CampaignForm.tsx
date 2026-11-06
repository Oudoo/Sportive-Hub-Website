"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { CAMPAIGN_SEGMENTS, type CampaignSegment } from "@/lib/format";

/** Award the same points to a whole segment at once: a celebration, an apology, a win-back. */
export function CampaignForm() {
  const router = useRouter();
  const [segment, setSegment] = useState<CampaignSegment>("ALL_ACTIVE");
  // The count for the segment it was fetched for; a mismatch means "still counting".
  const [reach, setReach] = useState<{ segment: CampaignSegment; patients: number } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ patients: number }>(`/api/admin/loyalty/campaign?segment=${segment}`)
      .then((r) => {
        if (!cancelled) setReach({ segment, patients: r.patients });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [segment]);

  const count = reach?.segment === segment ? reach.patients : null;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const points = Number(form.get("points"));
    if (!confirm(`Award ${points} points to ${count ?? "the selected"} patients? This cannot be undone in one click.`)) return;
    setPending(true);
    setError(null);
    setDone(null);
    try {
      const result = await api<{ patients: number; points: number }>("/api/admin/loyalty/campaign", {
        method: "POST",
        body: { segment, points, note: form.get("note"), confirm: true },
      });
      setDone(`Awarded ${result.points.toLocaleString()} points to ${result.patients} patients.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not run the campaign."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {done && <Alert tone="good">{done}</Alert>}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="Who" htmlFor="segment" hint={count === null ? "Counting…" : `${count} patient${count === 1 ? "" : "s"} right now`}>
          <Select id="segment" value={segment} onChange={(e) => setSegment(e.target.value as CampaignSegment)}>
            {Object.entries(CAMPAIGN_SEGMENTS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Points each" htmlFor="campaignPoints" error={error?.field("points")}>
          <Input id="campaignPoints" name="points" type="number" min={1} max={10000} defaultValue={20} required />
        </Field>
      </div>
      <Field label="Message" htmlFor="campaignNote" error={error?.field("note")} hint="Patients see this in their points history">
        <Input id="campaignNote" name="note" required minLength={3} maxLength={255} placeholder="Happy first anniversary, Sportive Hub!" />
      </Field>
      <Button type="submit" disabled={pending || count === 0} className="justify-self-start">
        {pending ? "Awarding…" : "Award points"}
      </Button>
    </form>
  );
}
