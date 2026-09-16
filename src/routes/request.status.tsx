import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicShell } from "@/components/PublicHeader";
import { RequestStatusBadge } from "@/components/request-badges";
import { canRequesterComment, displayRequestType, type PublicRequestView } from "@/data/requests";
import { addRequesterCommentFn, lookupRequestFn } from "@/lib/request-functions";
import { formatDate } from "@/lib/metrics";
import { RequestStatusResultSkeleton } from "@/components/skeletons";

type Search = { ticket?: string };

export const Route = createFileRoute("/request/status")({
  validateSearch: (search: Record<string, unknown>): Search => {
    const ticket = search["ticket"];
    return typeof ticket === "string" ? { ticket } : {};
  },
  head: () => ({
    meta: [
      { title: "Check IT request status" },
      {
        name: "description",
        content: "Look up an IT request by ticket number and email.",
      },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const { ticket: presetTicket } = Route.useSearch();
  const [ticket, setTicket] = useState(presetTicket ?? "");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<PublicRequestView | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    setBusy(true);
    try {
      const data = await lookupRequestFn({ data: { ticket, email } });
      setResult(data);
    } catch (error) {
      setResult(null);
      toast.error(error instanceof Error ? error.message : "Lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    setBusy(true);
    try {
      const data = await addRequesterCommentFn({ data: { ticket, email, body: reply } });
      setResult(data);
      setReply("");
      toast.success("Reply sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the reply.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Check request status</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter the ticket number from your confirmation and the email you used on the form.
        </p>
      </div>

      <form
        className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup();
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="ticket">Ticket number</Label>
          <Input
            id="ticket"
            value={ticket}
            onChange={(e) => setTicket(e.target.value)}
            placeholder="e.g. R-0001"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? "Looking up…" : "Look up"}
        </Button>
      </form>

      {busy && !result ? <RequestStatusResultSkeleton /> : null}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{result.ticket}</p>
                  <h2 className="text-lg font-semibold">{result.title}</h2>
                </div>
                <RequestStatusBadge status={result.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {displayRequestType(result.type)} · {result.department} · {result.module} · urgency {result.urgency}
              </p>
              <p className="whitespace-pre-wrap text-sm">{result.note}</p>
              {result.status === "Declined" && result.declineReason && (
                <p className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                  Declined: {result.declineReason}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-semibold">Status history</h3>
              <ul className="space-y-2 text-sm">
                {result.history.map((row) => (
                  <li key={row.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {row.fromStatus ? `${row.fromStatus} → ${row.toStatus}` : row.toStatus}
                      {row.reason ? ` — ${row.reason}` : ""}
                    </span>
                    <span className="text-muted-foreground">{formatDate(row.createdAt.slice(0, 10))}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-semibold">Comments</h3>
              {result.comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="space-y-3">
                  {result.comments.map((comment) => (
                    <li key={comment.id} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {comment.authorName} · {formatDate(comment.createdAt.slice(0, 10))}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              {canRequesterComment(result.status) ? (
                <div className="space-y-2">
                  <Label htmlFor="reply">Reply</Label>
                  <Textarea id="reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                  <Button type="button" disabled={busy || !reply.trim()} onClick={() => void sendReply()}>
                    Send reply
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This ticket is closed. Submit a new request if you need a follow-up.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </PublicShell>
  );
}
