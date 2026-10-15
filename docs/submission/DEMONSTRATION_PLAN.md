# 8–12 Minute Live Evaluation & Demonstration Plan

## LibTrack — Smart Library Management System
**Academic Context:** VTU 7th-Semester B.E. Big Data Project Evaluation  
**Estimated Demonstration Duration:** 10–12 Minutes  
**Demonstration Mode:** Local Evaluation (Zero-Config In-Memory Engine)

---

## 1. Pre-Demonstration Setup (1 Minute Prior)

Open two terminal windows:
```bash
# Terminal 1: Launch Backend with In-Memory MongoDB & Pre-seeded Telemetry
cd server
npm run dev:memory

# Terminal 2: Launch Frontend
cd client
npm run dev
```

Open your browser to: `http://localhost:5173`

---

## 2. Timed Demonstration Walkthrough

```mermaid
timeline
    title 10-Minute Examination Flow
    0:00 - 1:30 : Problem Statement & 12-KPI Dashboard
    1:30 - 3:00 : Book Catalog & Multi-Copy Accessioning
    3:00 - 4:30 : Member Directory & Borrowing Quotas
    4:30 - 6:30 : Circulation Desk - Issue & Return Workflow
    6:30 - 8:30 : Big Data Bulk CSV Import & Mutex Locking
    8:30 - 10:00 : Automated Email Reminders & Idempotency
    10:00 - 11:30 : Analytics & Compliance CSV Reports
    11:30 - 12:00 : Viva Summary & Q&A
```

### Phase 1: Problem Statement & Overview Dashboard (0:00 – 1:30)
- **Screen:** `Overview Dashboard` (`/overview`)
- **Key Talking Points:**
  - Introduce LibTrack as an institutional library management solution designed for VTU engineering colleges.
  - Highlight the 12-KPI real-time metrics cards: Point-in-time catalog holdings (8 titles, 54 copies, 37 available) versus 30-day transactional flow (6 loans issued, 2 returned).
  - Note the green **Database Connected** health badge in the header.

### Phase 2: Book Catalog & Multi-Copy Accessioning (1:30 – 3:00)
- **Screen:** `Book Inventory` (`/inventory`)
- **Action:**
  - Search for `"Algorithms"` in the real-time search bar.
  - Click **+ Add Book** and register a new title:
    - Title: *Big Data: Principles and Best Practices*
    - ISBN: `978-1617290343`
    - Author: *Nathan Marz, James Warren*
    - Category: *Computer Science & Engineering*
    - Shelf: *Stack CS-15*
    - Copies: `5`
  - Show the new record appears immediately in the table with 5 available copies.

### Phase 3: Patron Management & Quota Enforcement (3:00 – 4:30)
- **Screen:** `Members Directory` (`/members`)
- **Key Talking Points:**
  - Show academic quotas: Students are restricted to 4 books; Faculty can borrow up to 10 books.
  - Filter members by department (e.g. *Computer Science*).

### Phase 4: Circulation Desk Issue & Return Workflow (4:30 – 6:30)
- **Screen:** `Issue & Return` (`/issue-return`)
- **Action:**
  - **Issue Step:** Select student *Aarav Sharma* (`STU-2026-1001`), select the newly created book *Big Data: Principles and Best Practices*, and click **Issue Book to Member**.
  - Show that available copies immediately decrements from 5 to 4.
  - **Return Step:** Switch to the **Return Book** tab. Filter by Aarav's name, locate the loan, and click **Process Return**.
  - Show that available copies immediately increments back from 4 to 5, and the loan status transitions to `RETURNED`.

### Phase 5: Big Data Bulk CSV Batch Ingestion & Mutex Lock (6:30 – 8:30)
- **Screen:** `Bulk Data Import` (`/bulk-import`)
- **Action:**
  - Step 1: Click **Download Books Template** to show the standardized CSV structure.
  - Step 2: Upload a sample CSV file to demonstrate the 5-step wizard.
  - Step 3: Highlight the pre-validation bar showing valid rows versus syntax errors.
  - Step 4: Show the conflict policies: `SKIP_DUPLICATES`, `REJECT_CONFLICTS`, and `UPDATE_EXISTING`.
  - Step 5: Explain the Big Data engineering: 50-row chunked batching with an atomic in-memory mutex lock (`activeJobs`) preventing concurrent worker collisions.

### Phase 6: Automated Email Notifications & Idempotency (8:30 – 10:00)
- **Screen:** `Email Notifications` (`/notifications`)
- **Key Talking Points:**
  - Explain the headless `node-cron` background scheduler running daily at 08:00 AM (`0 8 * * *`).
  - Demonstrate the advance notice window (3 days prior to due date) and the 7-day repeat escalation cycle.
  - Explain the compound idempotency key ensuring zero duplicate emails across repeated cron runs.
  - Click **Evaluate & Send Reminders** to demonstrate live manual evaluation without waiting for the daily schedule.

### Phase 7: Advanced Analytics & Compliance CSV Reports (10:00 – 11:30)
- **Screen:** `Analytics & Reports` (`/analytics`)
- **Action:**
  - Change the date filter preset from `30D` to `7D` or `Month` and demonstrate real-time Recharts updates.
  - Show the dual-series **Circulation Volume Trends** (Issued in Teal vs. Returned in Navy).
  - Switch interval from **Daily** to **Weekly** or **Monthly**.
  - Show the **Most Borrowed Books Ranking** and **Overdue Duration Severity Buckets** (1–7d, 8–14d, 15–30d, 30+d).
  - Switch to the **Audit Reports & CSV Exports** tab.
  - Select the **Inventory Master Catalog** or **Circulation Audit** report and click **Export CSV Report**.
  - Open the downloaded CSV to show standard RFC 4180 formatting, metadata header comments, and single-quote formula injection protection (CWE-1236).

### Phase 8: Conclusion & Viva Voce Transition (11:30 – 12:00)
- Summarize that all 120 automated test cases are passing with zero defects.
- Invite examiner questions.
