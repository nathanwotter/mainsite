---
name: current-wellness-receipts
description: File Current Wellness receipt emails from the business and nw1978 Gmail accounts as consistently named PDFs in Google Drive and match them to QuickBooks Online bank transactions. Use when scanning Gmail or Drive for Current Wellness receipts, preparing or matching receipt attachments, or posting user-confirmed QuickBooks expenses; do not post without explicit current confirmation.
---

# Current Wellness Receipts

File receipts accurately, attach them to the right QuickBooks bank transactions, and leave an auditable result.

## Choose the requested scope

- Treat discovery, Drive filing, Gmail archiving, QuickBooks preparation, and QuickBooks posting as separate actions. Perform only the actions the user requested.
- Default QuickBooks behavior is to upload the receipt, select the vendor and category, and leave the transaction unposted.
- Posting requires the user's explicit confirmation for the exact prepared batch immediately before clicking **Post**. A past instruction or standing preference is not current confirmation.
- Creating a new QuickBooks vendor also requires current user direction.

Read [references/workflow.md](references/workflow.md) before filing, matching, or posting receipts. For QuickBooks vendor or category work, also read [references/vendor-mappings.md](references/vendor-mappings.md).

## Preserve the evidence chain

- File receipts only in the Current Wellness Google Drive account (`nathan@currentwellnessraleigh.com`). Never use the university Drive account (`cnwilli6@ncsu.edu`) unless the user explicitly requests it.
- Read the receipt itself for its date, payee, and amount. Do not infer unsupported values from the email subject, filename, or bank row.
- Require an exact amount match. Require either a date match or a credible settlement-timing explanation corroborated by the payee/vendor and amount.
- Detect duplicate emails, Drive files, attachments, and posted transactions before creating or changing anything.
- Keep a per-item record of the source email, PDF filename, Drive destination, bank date and amount, QuickBooks vendor, category, attachment status, and final state.
- Report ambiguous or incomplete items instead of guessing.

## Finish with verification

- Archive a source email only after its PDF is verified in the intended Drive folder. Archive; never delete.
- Confirm an attachment persisted on the correct bank row before posting.
- After posting, audit every item in **Posted** for date, amount, vendor, category, and attached receipt. Never use the Pending-count change as the sole proof of success, and never click **Undo** while auditing.
- If a posting result is uncertain, inspect Pending and Posted before retrying so a duplicate expense is not created.
