# Original profile interaction adaptation

Goal: Restore the supplied ZIP interactions, retaining authenticated backend data and existing login/register behavior. Work locally on the existing development branch; no commit or upload.

## Execution batches

- [ ] Personal home: replace the authenticated content in `client/views/MeView.tsx` using the supplied ZIP's ME block. Preserve the unauthenticated branch. Use authUser identity and wallet data; preserve original menu order. Do not fabricate a public profile from EPALS[0]. Unsupported destinations must report unavailable rather than claim success.
- [ ] Player orders: restore ZIP search, date filter, role-specific list and detail navigation in dedicated components. Audit actual backend order ownership and actions before connecting mutations; do not reuse customer rating actions for player orders.
- [ ] Game services: restore ZIP service list/sorting/editor. Map persisted services and actual write endpoints; remove mock success flows. If a matching write endpoint is absent, document the missing contract before implementing it.
- [ ] Public personal profile and secondary destinations: preserve original navigation, but use authenticated account/service identity instead of sample companions.
- [ ] Verify each batch with regression tests, type checking and browser clicks; document remaining gaps honestly.

First-batch tests: authenticated menu must retain Purchase History before Player Center, then Settings/New Users/Blacklist/Feedback; no extra ranking panel or hardcoded account identity. Login/register content must remain unchanged.
