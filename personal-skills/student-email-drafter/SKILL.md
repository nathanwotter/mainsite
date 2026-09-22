---
name: student-email-drafter
description: Draft informal, policy-aligned Gmail replies for student attendance makeups, including PRT 152 Adventure Team activities and PRT 358 Libraries video workshops, and Disability Resources Office accommodation-letter notifications. Use when an NCSU message or thread establishes student and course context; do not use for general university correspondence or unsupported student-request categories.
---

# Student Email Drafter

Draft replies in Nathan's voice while preserving his authority over every sent message.

## Scope the message

- Handle either of these supported categories:
  - An attendance-makeup request from a probable student: the sender address ends in `@ncsu.edu`, and the message or thread contains credible course context such as a course name or number, section, class meeting, assignment, attendance, Moodle, or an established instructor-student exchange.
  - A PRT 152 Adventure Team absence or makeup request. Determine the missed activity from the class date and the student's Adventure Team rather than assuming every student completed the same activity that day.
  - A PRT 358 absence from the Libraries workshop on planning, recording, and editing video. Confirm the missed session against the current course schedule and Moodle materials rather than routing every PRT 358 absence to this special case.
  - A Disability Resources Office message whose subject contains `Accommodation Letter Notification` and whose message or attached letter identifies the student and course.
- Do not assume every NCSU sender is a student. For accommodation notifications, address the student named in the message or letter, not the office sender.
- Read enough of the thread and any relevant attached letter to avoid asking for information already provided and to identify the student's first name, course context, and the facts needed by the applicable reply category.
- If a supported category's required student or course context is missing or ambiguous, create no draft and flag the message for Nathan.
- For other categories, create no draft and report the category so the skill can be expanded later.

## Draft safely

- Create a reply draft in the existing Gmail thread. Never send it.
- Do not archive, delete, label, mark read, or otherwise change messages.
- Before creating a draft, check whether the thread already has one. Do not create a duplicate; report the existing draft instead.
- Before revising an existing draft, reread its latest contents. Preserve Nathan's intervening edits and make only the requested changes; never rebuild the body from a stale copy.
- Do not invent dates, course details, activities, circumstances, accommodations, or exceptions.
- If a missed class included an activity that may require customized makeup work and the necessary details are unavailable, do not improvise. Flag it for Nathan. PRT 152 Adventure Team activities are supported when [references/adventure-team-makeup.md](references/adventure-team-makeup.md) supplies the needed routing or template.
- For an attendance-makeup request, read and follow [references/attendance-makeup.md](references/attendance-makeup.md).
- For a PRT 152 Adventure Team absence or makeup request, read and follow [references/adventure-team-makeup.md](references/adventure-team-makeup.md). Its activity-specific requirements replace the ordinary attendance-makeup assignment for that missed class period unless Nathan explicitly says otherwise.
- For a PRT 358 Libraries video-workshop absence, read and follow [references/prt358-libraries-video-makeup.md](references/prt358-libraries-video-makeup.md). Its hands-on equipment, Libraries-space, and editing requirements replace the ordinary attendance-makeup assignment for that missed class period unless Nathan explicitly says otherwise.
- For a Disability Resources Office message with `Accommodation Letter Notification` in the subject, read and follow [references/accommodation-letter.md](references/accommodation-letter.md).

## Match Nathan's voice

- Use a warm, relatively informal, direct tone.
- Begin the first paragraph with `Hi, [first name].` When the acknowledgment is brief, continue it in that same paragraph rather than forcing the greeting onto a separate line or paragraph.
- When Nathan has edited an existing draft, treat his paragraphing and line breaks as the strongest style reference for similar messages. For Adventure Team makeups, normally keep the greeting and brief acknowledgment together in one opening paragraph, leave a blank line before the makeup explanation, use a clean numbered list with one action per item, and give the final note and closing their own paragraphs. Avoid an automatic blank line immediately after the greeting when the acknowledgment follows naturally on the same line.
- Briefly acknowledge only the circumstance the student explicitly stated. For illness, a short hope that they feel better is appropriate. For a family emergency, express brief concern without asking for private details. For a professional or educational opportunity, express interest or encouragement. When the circumstance is vague or absent, use a neutral acknowledgment such as `Thanks for letting me know.`
- Avoid generic effusiveness, legalistic phrasing, and claims that an exception has been approved unless the policy clearly provides it.
- Choose a natural final wish for the time of week in America/New_York. On Friday or immediately before a weekend, `Have a great weekend` is appropriate; otherwise use wording such as `Hope your week goes well` or `See you in class` when supported by the thread.
- Format the message body as ordinary compact Gmail prose: use paragraphs for prose and native lists only where a list improves readability. Do not add extra blank paragraphs around the greeting, closing, or body. Keep the body formatting separate from the untouched signature fragment.
- Include Nathan's complete current Gmail signature on every draft created or updated by this skill.
- Retrieve the signature fresh during the run from the most recent representative human-written sent email from the same Gmail account. When available, compare at least two recent sent messages to confirm that the signature fields and links agree. Prefer these recent sent messages over old, empty, signature-only, test, or previously generated drafts, which may contain stale titles, addresses, formatting, or links.
- Copy the complete `gmail_signature` block from the verified source HTML as one intact fragment, preserving its compact `<div>` line structure, spacing, `---` separator, bold linked `Nathan Williams, Ph.D.`, font styling, and working hyperlinks. Never reconstruct it from rendered text, Markdown, snippets, or a line-by-line approximation; do not replace its `<div>` structure with separate `<p>` elements. Do not copy quoted thread content. The HTML signature should retain all current links, such as the linked faculty-profile name, Instagram, LinkedIn, and office-hours appointment when those appear in the verified source. The plain-text alternative should include the corresponding destination URLs.
- Keep the linked name `Nathan Williams, Ph.D.` non-italic: never wrap it in `<i>` or `<em>` or apply italic CSS.
- If a complete current signature cannot be verified, do not create or update the Gmail draft. Flag the thread for Nathan instead of silently using `Nathan` alone or a possibly stale signature.

## Report the result

Briefly list each thread for which a draft was created, skipped because a draft already existed, or flagged for Nathan. Include the reason for every flagged message. Do not expose unnecessary private details in the report.
