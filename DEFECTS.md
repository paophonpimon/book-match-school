# Acceptance defects

## Summary

- Blocker: 0
- Critical: 0
- Major: 0
- Minor: 1 open observation
- Application defects fixed in this phase: 0

## Minor observation — Rules denial diagnostics can exhaust the expression budget

Expected-denial cases (missing membership, suspended member, hidden book, duplicate request and mismatched identity) are denied correctly. The Firestore Emulator sometimes reports that evaluation reached the 1,000-expression ceiling while evaluating all related writes in the atomic batch. This is fail-closed and did not affect the valid active-member request or any Admin transition.

Impact: noisy diagnostics and some extra Rules evaluation work on deliberately invalid commits. No security boundary is opened and no valid flow failed. It was not changed because the request limits fixes to Blocker/Critical/Major and Rules must not be broadened.

## Harness corrections (not application defects)

- Auth fixture verification was changed to the Emulator's privileged account-update endpoint.
- Desktop navigation assertion was corrected to use the sidebar instead of the hidden mobile nav.
- Card geometry assertion now allows up to three CSS subpixels of browser rounding while still requiring fixed width, centered position and reset transforms.
