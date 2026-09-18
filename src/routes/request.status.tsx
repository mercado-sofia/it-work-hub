import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PublicShell } from "@/components/PublicHeader";
import { RequestStatusBadge } from "@/components/request-badges";
import { RequestStatusHistoryList } from "@/components/RequestStatusHistoryList";
import {
  canRequesterComment,
  displayRequestType,
  requestOutcomeNotice,
  requesterClosedMessage,
  type PublicRequestView,
} from "@/data/requests";
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
  const outcome = result ? requestOutcomeNotice(result.status, result.declineReason) : null;

  const lookup = async () => {
    setBusy(true);
    try {
      const data = await lookupRequestFn({ data: { ticket, email } });
      setResult(data);
    } catch (error) {
      setResult(null);
      toastError(error, "Lookup failed. Please try again.");
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
      toastError(error, "Could not send the reply. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PublicShell>
      <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Check request status</h1>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
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
        <Button type="submit" className="h-10 w-full sm:w-auto" disabled={busy}>
          {busy ? "Looking up…" : "Look up"}
        </Button>
      </form>

      {busy && !result ? <RequestStatusResultSkeleton /> : null}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{result.ticket}</p>
                  <h2 className="text-lg font-semibold break-words">{result.title}</h2>
                </div>
                <RequestStatusBadge status={result.status} />
              </div>
              <p className="text-sm leading-relaxed break-words text-muted-foreground">
                {displayRequestType(result.type)} · {result.department} · {result.module} · urgency {result.urgency}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">{result.note}</p>
              {outcome ? (
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{outcome.heading}</p>
                  <p className="mt-1 whitespace-pre-wrap">{outcome.reason}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 sm:gap-3">
                <h3 className="text-sm font-semibold">Status history</h3>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {result.history.length} {result.history.length === 1 ? "update" : "updates"}
                </span>
              </div>
              <RequestStatusHistoryList history={result.history} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
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
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              {canRequesterComment(result.status) ? (
                <div className="space-y-2">
                  <Label htmlFor="reply">Reply</Label>
                  <Textarea id="reply" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
                  <Button
                    type="button"
                    className="h-10 w-full sm:w-auto"
                    disabled={busy || !reply.trim()}
                    onClick={() => void sendReply()}
                  >
                    Send reply
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{requesterClosedMessage(result.status)}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </PublicShell>
  );
}
