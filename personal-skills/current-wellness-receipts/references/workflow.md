# Receipt filing and QuickBooks workflow

## Accounts and tool routing

- For the Current Wellness inbox, use the connected Gmail account named **Current Wellness** (`nathan@currentwellnessraleigh.com`). If the requested mailbox is ambiguous among connected accounts, resolve the account before changing mail.
- Use the connected Google Drive for filing and inspect the live folder structure before writing.
- Use the signed-in QuickBooks Online **Bank transactions** interface for receipt uploads and matching. Do not route this workflow through QuickBooks' separate Receipts interface.
- Use PDF-capable tooling to create and visually verify PDFs. Use browser control for QuickBooks when no purpose-built QuickBooks connector is available.

## Discover and classify receipts

1. Search only the mailbox/date/status scope the user requested.
2. Read the full relevant email and its attachment or linked receipt.
3. Establish the payee, monetary amount, and receipt, invoice, or payment date from the receipt evidence.
4. Check whether the email, receipt, or resulting file has already been handled. Treat matching content, not merely a similar subject, as the duplicate signal.
5. Flag missing or conflicting fields. Do not invent a value to make an item fit a bank row.

## Create and file the PDF

- Name the PDF `MMDDYYYY_<payee> <amount>.pdf`.
- Omit the dollar sign and preserve two decimal places, for example `08062026_Acme Services 125.00.pdf`.
- Use the receipt date in the filename, not a later bank settlement date.
- Make the payee portion filesystem-safe while keeping it recognizable. Avoid characters that are invalid or unreliable in Windows, Drive, or downstream accounting uploads.
- Search Drive for `Receipts - YYYY`, where `YYYY` is the receipt year. Inspect the existing hierarchy and file the PDF in its correct year/month destination. Reuse existing folders and do not assume a month-folder naming style without observing it.
- Verify the uploaded PDF exists in the intended folder and can be opened or fetched before changing the email.
- Archive only the successfully filed source email. Leave unresolved or failed items in place and report them.

## Prepare the QuickBooks bank row

1. Search Pending bank transactions using the amount and the relevant date range.
2. Require an exact amount match. Prefer an exact date match.
3. If dates differ because a payment settled later, require a credible timing explanation plus the same payee/vendor and exact amount. A known pattern such as a Venmo payment settling a few days later can explain the date difference, but timing alone is never sufficient.
4. Check Pending and Posted for an existing match before editing.
5. Expand the intended row and select the exact existing vendor from the dropdown. A display-name variant is acceptable only when the mapping reference identifies it and the underlying record is confirmed.
6. Select the category from the mapping reference or the user's current instruction. Flag a genuinely unclear category.
7. Upload the matching PDF through the bank row and confirm the attachment indicator or detail view shows that exact file.
8. Leave the row unposted unless the user has just confirmed posting the prepared batch.

## Post and audit

Immediately before posting, summarize the exact batch or otherwise make its scope unambiguous and obtain explicit current confirmation.

For each confirmed row:

1. Recheck bank date, amount, vendor, category, and attached filename.
2. Click **Post** once.
3. Wait for a durable result. If the row appears not to move, inspect Pending and Posted before retrying.
4. In **Posted**, verify the date, amount, vendor, category, and receipt attachment for that item. Open transaction detail when the table omits a vendor or attachment status.

Do not click **Undo** during verification. At the end, report posted and unposted counts, each exception, and the evidence used to verify the final state. Do not claim every attachment was checked if only a sample was inspected.
