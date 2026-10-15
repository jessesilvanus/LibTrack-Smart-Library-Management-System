# Testing Document & Quality Assurance Verification

## LibTrack — Smart Library Management System
**Academic Project:** Visvesvaraya Technological University (VTU)  
**Verification Framework:** Node.js, `tsx`, In-Memory MongoDB Server (`mongodb-memory-server`)  
**Overall Automated Test Status:** 120 / 120 Passed (100% Green)  
**Document Version:** 1.0 (Final Submission Candidate)

---

## 1. Testing Strategy & Methodology

LibTrack utilizes automated end-to-end integration test suites running against an isolated in-memory MongoDB engine (`mongodb-memory-server`). This architecture guarantees:
- **Zero Destruction of Production Data:** Tests run against fresh, temporary in-memory databases with isolated collections.
- **Repeatability:** Every test execution creates schemas, builds unique indexes, runs multi-step transactional flows, asserts invariants, and destroys test instances cleanly.
- **Deterministic Time Boundaries:** Date-boundary calculations (due dates, grace periods, 7-day repeat intervals) are verified using offset time fixtures.

---

## 2. Test Execution Summary

```
========================================================================
Test Suite                             File                    Tests   Status
========================================================================
1. Workflows & Circulation Invariants  workflow-integration.test.ts  12   ✅ PASS
2. Email Notifications & Scheduler     notifications.test.ts        26   ✅ PASS
3. Bulk CSV Ingestion & Batch Mutex    bulk-import.test.ts          26   ✅ PASS
4. Advanced Analytics & Reports        analytics.test.ts            56   ✅ PASS
========================================================================
TOTAL AUTOMATED TEST VERIFICATION                                 120   ✅ 100% PASS
========================================================================
```

Execution command:
```bash
cd server
npm test
```

---

## 3. Detailed Test Traceability Matrix

### 3.1 Suite 1: Workflows & Circulation (`workflow-integration.test.ts`)
| ID | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|:---:|
| TC-WF-01 | Book creation with valid metadata | Record created in MongoDB with normalized ISBN | Created with _id, valid copies | ✅ PASS |
| TC-WF-02 | Book creation with empty title / copies < 1 | Mongoose validation error thrown | Rejected with descriptive error | ✅ PASS |
| TC-WF-03 | Duplicate ISBN insertion | Unique index collision error thrown | Rejected with duplicate key code | ✅ PASS |
| TC-WF-04 | Member registration & duplicate check | Member created; duplicate memberId / email rejected | Unique index enforced on memberId & email | ✅ PASS |
| TC-WF-05 | Book issuance to suspended patron | Blocked by status verification | Borrow rejected with eligibility error | ✅ PASS |
| TC-WF-06 | Book issuance when availableCopies is 0 | Checkout blocked | Rejected with OUT_OF_STOCK error | ✅ PASS |
| TC-WF-07 | Available copies decrement on checkout | `availableCopies` decremented by exactly 1 | Inventory decremented atomically | ✅ PASS |
| TC-WF-08 | Available copies increment on check-in | `availableCopies` incremented by exactly 1 | Inventory restored to shelves | ✅ PASS |
| TC-WF-09 | Duplicate return attempt on returned loan | Second return rejected | Throws ALREADY_RETURNED error | ✅ PASS |
| TC-WF-10 | Total copies reduction below active loans | Blocked by loan inventory constraint | Protected against invalid reduction | ✅ PASS |
| TC-WF-11 | Search, filter, and pagination queries | Paginated book listings with category filters | Accurate subset returned | ✅ PASS |
| TC-WF-12 | Empty collection query handling | Graceful empty array returned with pagination | 0 records returned without crash | ✅ PASS |

### 3.2 Suite 2: Automated Email Reminders (`notifications.test.ts`)
| ID | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|:---:|
| TC-NOTIF-01 | HTML Escaping in email templates | `<script>` and quotes escaped to entities | XSS neutralized | ✅ PASS |
| TC-NOTIF-02 | Loan due in $\le 3$ days eligibility | Dispatches due-soon notification | Dispatched with status SENT | ✅ PASS |
| TC-NOTIF-03 | Loan due in 10 days exclusion | Excluded from dispatch | 0 notifications generated | ✅ PASS |
| TC-NOTIF-04 | Returned loan exclusion | Returned books receive 0 reminders | Excluded from dispatch | ✅ PASS |
| TC-NOTIF-05 | First overdue detection | Loan transitions to OVERDUE, email sent | Status updated, email sent | ✅ PASS |
| TC-NOTIF-06 | Idempotency on repeated cron runs | Subsequent run dispatches 0 duplicate emails | 0 duplicate dispatches | ✅ PASS |
| TC-NOTIF-07 | 7-day repeat overdue cycle | Dispatches repeat notice only after 7 days | Cycle 1 notice triggered on day 8 | ✅ PASS |
| TC-NOTIF-08 | Concurrency race protection | Two concurrent triggers send exactly 1 email | Exactly 1 notification logged | ✅ PASS |
| TC-NOTIF-09 | Invalid email address handling | Skipped gracefully without halting batch | Error handled, batch continues | ✅ PASS |
| TC-NOTIF-10 | Dispatch failure tracking | Failed attempt logged with errorSummary | Status marked FAILED | ✅ PASS |
| TC-NOTIF-11 | Mock transport mode reporting | Accurately identifies MOCK_TRANSPORT | Connection verified in mock mode | ✅ PASS |
| TC-NOTIF-12 | Manual reminder trigger | Returns full audit summary stats | Stats object returned | ✅ PASS |
| TC-NOTIF-13 | Unauthorized reminder trigger | Request without x-admin-key rejected | HTTP 403 Forbidden | ✅ PASS |
| TC-NOTIF-14 | Admin test email explicit recipient | Sends test email strictly to specified email | Target recipient verified | ✅ PASS |
| TC-NOTIF-15 | Immediate cessation upon return | No further reminders sent after check-in | 0 notices after book return | ✅ PASS |

### 3.3 Suite 3: Bulk CSV Import & Batch Processing (`bulk-import.test.ts`)
| ID | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|:---:|
| TC-IMP-01 | Standard CSV templates generation | RFC 4180 headers generated for books and members | Headers match schema | ✅ PASS |
| TC-IMP-02 | CSV formula injection mitigation | `=`, `+`, `@` prepended with single quote (`'`) | Formula trigger neutralized | ✅ PASS |
| TC-IMP-03 | Complex CSV with embedded commas | Preserves quoted commas without misalignment | Exactly 1 row parsed | ✅ PASS |
| TC-IMP-04 | Malformed and empty CSV rejection | Empty or missing columns rejected | Clear error message | ✅ PASS |
| TC-IMP-05 | Row-by-row books validation | Flags missing title, bad ISBN, negative copies | Row errors mapped accurately | ✅ PASS |
| TC-IMP-06 | Row-by-row members validation | Flags invalid email, missing memberId | Row errors mapped accurately | ✅ PASS |
| TC-IMP-07 | In-file duplicate detection | Flags repeated ISBNs within single upload | DUPLICATE_IN_FILE code logged | ✅ PASS |
| TC-IMP-08 | Batch execution (`SKIP_DUPLICATES`) | Valid rows written, duplicates bypassed | Ingests new, skips existing | ✅ PASS |
| TC-IMP-09 | Batch execution (`UPDATE_EXISTING`) | Updates metadata without corrupting active loans | Values updated cleanly | ✅ PASS |
| TC-IMP-10 | Safe partial retry execution | Retries only failed rows without duplicating success | Recovered without duplication | ✅ PASS |
| TC-IMP-11 | Mutex concurrency protection | Second worker attempt rejected while job is active | HTTP 409 Conflict | ✅ PASS |
| TC-IMP-12 | Admin authorization guard | Rejects upload without valid x-admin-key | HTTP 403 Forbidden | ✅ PASS |
| TC-IMP-13 | Cross-module catalog integration | Newly imported books immediately eligible for loans | Seamless borrowing verified | ✅ PASS |

### 3.4 Suite 4: Advanced Analytics & Reports (`analytics.test.ts`)
| ID | Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|:---:|
| TC-ANL-01 | Date range parsing & validation | Correct presets (`today`, `7d`, `30d`, `90d`, `month`) | Presets parsed accurately | ✅ PASS |
| TC-ANL-02 | Inverted custom range rejection | Rejects `startDate > endDate` | Error thrown | ✅ PASS |
| TC-ANL-03 | Excessive range protection | Rejects date range > 366 days | Protected against unbounded query | ✅ PASS |
| TC-ANL-04 | 12-KPI summary accuracy | Exact match between KPI counts and database records | All 12 metrics verified | ✅ PASS |
| TC-ANL-05 | Circulation trends series | Daily issued vs returned counts segregated | Correct series values | ✅ PASS |
| TC-ANL-06 | Popular books ranking | Ranks by actual loan count rather than total copies | Borrow count ranking verified | ✅ PASS |
| TC-ANL-07 | Category distribution | Correct loan counts and percentages by category | Percentage totals 100% | ✅ PASS |
| TC-ANL-08 | Member engagement & PII protection | Active borrowers counted; private email omitted | PII not leaked in aggregate | ✅ PASS |
| TC-ANL-09 | Overdue duration bucketing | Loans grouped into 1–7d, 8–14d, 15–30d, 30+d | Accurate bucket placement | ✅ PASS |
| TC-ANL-10 | Inventory insights & low stock alert | Flags titles with copies $\le 2$ | Critical stock alert generated | ✅ PASS |
| TC-ANL-11 | Tabular reports generation (7 reports) | Returns structured paginated rows for all 7 reports | All 7 report types verified | ✅ PASS |
| TC-ANL-12 | CSV export & CWE-1236 mitigation | Exports RFC 4180 CSV with single quote escaping | Exploit formula neutralized | ✅ PASS |
| TC-ANL-13 | Admin security guard on analytics | Rejects unauthorized requests without x-admin-key | HTTP 403 Forbidden | ✅ PASS |

---

## 4. Defects Found & Resolved During Audit

1. **Defect D-01: CSV Formula Injection Test Assertion Formatting**  
   - *Symptom:* Assertion checked for `''=CMD` instead of single prepended quote `'=CMD`.  
   - *Fix:* Aligned test assertion in `analytics.test.ts` to match standard `sanitizeCsvCell` single-quote behavior.
2. **Defect D-02: Missing `.gitignore` in Workspace**  
   - *Symptom:* Environment files and `node_modules` were untracked.  
   - *Fix:* Created root `.gitignore` ignoring `.env`, build artifacts, and dependency trees.
3. **Defect D-03: TypeScript Strict Narrowing in UI Pages**  
   - *Symptom:* Discriminator union `ApiResponse<T>` had unused destructuring in error handling.  
   - *Fix:* Refactored to `if (res.success) { ... } else { ... res.error.message ... }`, allowing TypeScript to cleanly narrow the error branch.
4. **Defect D-04: Nonfunctional Sidebar Navigation Routes**  
   - *Symptom:* Sidebar routes `history` and `due-soon` routed to placeholder views.  
   - *Fix:* Linked `history` to Circulation Audit report and `due-soon` to Overdue Defaulters report in `App.tsx`.
