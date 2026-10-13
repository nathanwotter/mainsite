---
name: weekly-interest-digest
description: Compile and email Nathan's weekly interest digest from four approved plugin-connected Gmail accounts, conservatively archive probable spam from those accounts, and record archived items for review. Use for the recurring weekly interest-email workflow; do not use for general inbox cleanup or delegated inboxes.
---

# Weekly Interest Digest

Prepare Nathan's established weekly digest, keep its account and recipient scope fixed, and leave an auditable record of any probable-spam messages archived during the run.

## Preserve the approved scope

- Use exactly these four plugin-connected accounts for source scanning and probable-spam review: `cnwilli6@ncsu.edu`, `nw1978@gmail.com`, `nathan@currentwellnessraleigh.com`, and `nathan@otteradventures.org`.
- Prefer the Gmail connector for reads and archive actions. Browser session state is not evidence that connector access is available or unavailable; if connector access to an approved account cannot be verified during a run, report that account as unscanned rather than substituting browser access or silently narrowing the result.
- Send the digest from `cnwilli6@ncsu.edu` to `cnwilli6@ncsu.edu` with subject `Weekly interest digest — YYYY-MM-DD`.
- Do not scan, summarize, archive, or otherwise change delegated inboxes. Additional signed-in, delegated, or discoverable accounts do not expand this exact four-account scope.
- A request to review or revise the workflow is not permission to run it. Archive messages or send the digest only when the current invocation authorizes those actions.

Read [references/workflow.md](references/workflow.md) before running the digest or changing mailbox state.

## Keep the weekly format recognizable

- Reuse the recent digest's plain, compact structure: title and date, concise topical headings, bulleted items with a short explanation and useful link, then the run/source note.
- Retain the established subject format and topical vocabulary. Omit empty topical sections rather than padding the message.
- Deduplicate repeated alerts and cross-posted items. Prefer original or durable destination links over tracking links when available.
- Treat the sent digest itself as the run log. Do not create a second logging system unless Nathan asks for one.

## Archive probable spam conservatively

- Scan each accessible approved account's Inbox for probable spam during the same run. Archive it in its source account; never delete it, empty trash, or report it as spam.
- Require multiple strong spam signals and no meaningful sign that the message belongs to Nathan's teaching, advising, research, university, professional, or client work.
- Do not archive ordinary student or client correspondence, replies in an existing human thread, operational university notices, account/security messages, receipts, invoices, benefits or HR messages, grant or conference deadlines, calendar messages, or relevant professional newsletters merely because they are bulk mail.
- When uncertain, leave the message in place. False negatives are safer than silently hiding legitimate correspondence.
- Verify that each archived message leaves Inbox but remains available in All Mail.

## Make archived messages easy to review

- End the email with an `Archived as probable spam` section after the normal source/run note.
- List only messages actually archived in that run. If none were archived, write `None this week.`
- Put the items most likely to be false positives first. Within an equal review-risk level, use newest first.
- Keep each item to one concise line: source account, linked sender and subject, received date, a short spam rationale, and, only when useful, a few words explaining the false-positive risk. Use a stable Gmail identifier when a review link cannot be retained.
- Do not include message-body excerpts or sensitive content when sender, subject, date, rationale, and link are sufficient.
