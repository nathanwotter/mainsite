# Weekly interest digest workflow

## Established run record and approved mailbox scope

Recent sent digests establish the operating contract:

- Digest sender: `cnwilli6@ncsu.edu`
- Recipient: `cnwilli6@ncsu.edu`
- Subject: `Weekly interest digest — YYYY-MM-DD`
- Approved source and probable-spam accounts: `cnwilli6@ncsu.edu`, `nw1978@gmail.com`, `nathan@currentwellnessraleigh.com`, and `nathan@otteradventures.org`
- Primary source label where present: `Weekly Digest Sources`
- Other inputs: the already established named recurring sources and a limited discovery scan across the approved accounts
- Log: the sent digest message, including its scan-window/source note

Use the Gmail connector for mailbox reads and archive actions. Do not infer connector availability from a browser session, including an expired browser login. If an approved account cannot be accessed through the connector during a run, report it as unscanned and continue with the other approved accounts only when the run can accurately disclose that partial coverage.

Never access a delegated inbox for this workflow. Do not infer broader scope from other accounts that happen to be signed in, delegated, or discoverable. If the established label or source set cannot be inspected in an approved account, report that limitation rather than substituting another mailbox.

## Collect digest candidates

1. Determine the weekly window from the previous digest and current run date. Use the same inclusive date convention as recent runs.
2. Search `Weekly Digest Sources` where present, the established recurring sources, and the limited discovery set across the four approved accounts.
3. Read enough of each candidate to establish its topic, date or deadline, relevance, and destination link. Search snippets alone are not adequate evidence.
4. Deduplicate repeated alerts, cross-posts, reminder sequences, and newsletter copies. Prefer the clearest and most authoritative instance.
5. Rank by usefulness to Nathan: time-sensitive items first, then strong teaching, research, recreation, outdoor, health, conservation, sport-management, grant, conference, and professional-development items.
6. Preserve the current digest's compact style. Each bullet should have a specific headline, one short explanatory paragraph, and one useful link.

Use these recent section names when they fit:

- `Worth acting on`
- `AI in higher education and teaching`
- `Parks, recreation, tourism, and leisure research`
- `Sport management and digital leisure`
- `Nature, health, conservation, and outdoor recreation`
- `Grants, conferences, and professional opportunities`
- `Suggested source to label`

Do not force an item into an irrelevant section and do not include an empty section.

## Identify probable spam

Review messages currently in each accessible approved account's Inbox, including items outside the digest-source label. Do not inspect delegated inboxes. Read the full message and thread context before deciding; snippets are not enough.

### Relationship-and-intent rubric

First identify protections. Keep the message when there is concrete evidence of any of these:

- an existing two-way human relationship or a thread Nathan has participated in;
- content Nathan requested or knowingly subscribed to;
- an actual ongoing vendor, customer, client, partner, reservation, purchase, or service relationship;
- protected student, advising, course, university-operation, legal, financial, security, HR, benefits, travel, calendar, grant, conference, journal-review, or personal correspondence.

Do not infer a relationship from a first-name greeting, a reference to one of Nathan's organizations or interests, sender-domain authentication, or a plausible product category. These facts may reduce false-positive confidence, but they do not establish that outreach was wanted.

When no protection applies, score the observable outreach signals:

- +2 unsolicited commercial outreach;
- +2 explicit commercial call to action, such as booking a demo, requesting a sales reply, accepting a sample, buying, or sharing a case study;
- +2 mass-outreach language, reusable case-study framing, or a templated campaign pattern;
- +1 generic personalization limited to Nathan's name or a public fact;
- +1 delivery to an unrelated recipient account for the business or role being pitched;
- +3 deceptive or materially mismatched sender identity, reply-to, domain, links, or stated organization;
- +2 repeated near-identical outreach after no engagement;
- +2 suspicious attachment framing, incoherent content, implausible urgency, prizes, crypto/investment claims, or misleading links.

Decide from the total:

- 4 or more: archive as probable spam;
- 2-3: leave in Inbox and report as borderline;
- 0-1: keep without flagging.

A superficial topic match and domain authentication each add zero points and remove no points. For example, a cold EHR pitch mentioning Current Wellness and a cold product-sample offer tied to botanical blends can still meet the archive threshold when there is no prior relationship or requested contact.

Strong indicators include:

- unsolicited cold outreach unrelated to Nathan's work, with generic personalization or a mass-pitch pattern;
- deceptive or mismatched sender identity, reply-to, domain, subject, and stated organization;
- implausible urgency, prizes, investment or crypto offers, account scares unrelated to a service Nathan uses, or requests to move the conversation off-platform;
- repeated near-identical pitches from the same campaign after no engagement;
- irrelevant SEO, lead-generation, publishing, conference, awards, or vendor solicitations with no credible connection to Nathan's roles;
- incoherent content, suspicious attachment framing, or link text that materially misrepresents its destination.

Never treat these facts alone as sufficient evidence of spam: a newsletter format, an unfamiliar sender, an unsubscribe link, or low personal interest. Promotional language contributes only when it is part of unsolicited commercial outreach under the rubric.

Do not archive:

- student, prospective-student, advisee, alumni, guest, collaborator, colleague, or client correspondence;
- course, Moodle, accessibility/accommodation, grading, registration, advising, or campus-system messages;
- human replies or messages in a thread Nathan has participated in;
- receipts, invoices, payment notices, account-security notices, benefits, HR, legal, travel, reservations, or calendar mail;
- grants, calls for proposals, journal review invitations, conferences, jobs, professional associations, or relevant publications unless the message is clearly deceptive or an unrelated mass solicitation;
- anything whose protected status or thread history remains uncertain after reading the full message and checking the thread context; report it for review instead.

For consistent decisions, use the same fields and scoring implemented in `scripts/SpamClassifier.psm1`. Run `scripts/test-spam-classifier.ps1` after changing this policy or classifier.

## Archive and verify

For each message that clears the threshold:

1. Record the source account, sender name and address, subject, received date/time, Gmail thread or message identifier, review link, score, spam rationale, and false-positive consideration before changing Inbox state.
2. Use Gmail's **Archive** action. Do not use **Delete** or **Report spam**.
3. Confirm the message is absent from Inbox and still retrievable in All Mail or through its recorded link/identifier.
4. If the result is uncertain, inspect the thread before retrying. Do not repeat the archive action blindly.

Only verified archive results belong in the digest's archived-spam list. After verification, append a compact JSON object to `state/spam-archive-review.jsonl` with the recorded fields and `status` set to `pending_digest`. This ignored local file bridges spam-only runs to the next digest; it is not a substitute for the sent digest as the durable record. Do not record message bodies, credentials, or authentication-bearing URLs.

## Compose the email

Match the recent HTML email structure rather than pasting Markdown syntax:

1. Heading: `Weekly interest digest`
2. Written date, for example `October 9, 2026`
3. Non-empty topical sections and bullet lists
4. Optional `Suggested source to label` section; suggestions are informational and do not authorize label changes
5. A short source/run note stating the date window, which approved accounts were scanned or unscanned, the established sources used, and the deduplication result
6. Final heading: `Archived as probable spam`

Read pending entries from `state/spam-archive-review.jsonl` and combine them with archives from the current run. Order archived items by false-positive risk, highest risk first. Keep each item to one line:

```text
Source account - Sender - linked subject (received date) - concise spam rationale; review risk: brief counter-signal.
```

Omit the review-risk clause when there is no meaningful counter-signal, and keep those clear cases after the borderline ones. Use a stable Gmail identifier in place of the link when necessary. If nothing was archived, write `None this week.`

The source/run note should continue to say that digest-source messages were not archived, deleted, or relabeled. Make clear that the separate probable-spam items listed below were archived, not deleted.

After the digest is successfully sent, remove only the pending entries that were included. If sending is not authorized or fails, leave them pending.

## Final verification

- Confirm the From, To, subject date, written date, and scan window agree.
- Check that links resolve to the intended item or Gmail thread and do not expose authentication tokens.
- Confirm all four approved accounts were scanned or explicitly disclosed as unscanned, and that no delegated or other out-of-scope account was searched or changed.
- Confirm every listed spam item was actually archived and remains recoverable.
- Confirm the archived-spam section is the final section and is sorted with likely false positives first.
- Send only when the current request or scheduled invocation authorizes sending; otherwise leave a draft and report that state accurately.
