# Email templates

Branded HTML for Supabase's auth emails (ink/yellow, matches the app's own UI — squared
borders, Barlow-style uppercase headers, yellow CTA button).

These aren't read by Supabase automatically — paste each file into Authentication → Emails →
Templates → *(template name)* → HTML source editor, in the dashboard.

| File | Supabase template | Wired up in the app? |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Yes — the only email flow currently in use (`src/services/authService.ts`'s `signUp`) |
| `magic-link.html` | Magic Link | Not yet — ready for when passwordless sign-in is added |
| `reset-password.html` | Reset Password | Not yet — ready for when a forgot-password screen is added |

`confirm-signup.html` personalizes the greeting from `{{ .Data.display_name }}`, which comes
from `signUp()`'s `options.data.display_name` — already set in `authService.ts`.
