import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.session) throw redirect({ to: "/dashboard" });
    throw redirect({ to: "/", search: { view: "login" }, replace: true });
  },
  component: () => null,
});
