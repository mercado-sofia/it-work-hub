import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/request/")({
  beforeLoad: () => {
    throw redirect({ to: "/", search: { view: "request" }, replace: true });
  },
  component: () => null,
});
