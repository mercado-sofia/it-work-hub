# Responsive start and request experience

## Scope
- Make the initial choice screen fit compact phones without oversized cards, awkward gaps, or clipped content.
- Make the sign-in screen use tighter mobile spacing and a full-width, readable form.
- Make the request form and confirmation state stack cleanly on narrow screens, including actions, attachments, and duplicate warnings.
- Make the public status header and lookup page fit small screens without crowding or horizontal overflow.

## Implementation
- Replace fixed full-screen sizing with safe viewport sizing and controlled vertical scrolling.
- Use mobile-first spacing, sizing, and stacking; retain the current tablet and desktop layout at existing breakpoints.
- Reduce decorative preview height on small screens and preserve comfortable tap targets.
- Fix the existing error-message typecheck issue currently blocking a clean build.
- Verify at compact phone, standard phone, tablet, and desktop widths with screenshots and overflow checks.

## Boundaries
- Keep the current visual style, wording, routes, and request behavior unchanged.
- No database or workflow changes.
