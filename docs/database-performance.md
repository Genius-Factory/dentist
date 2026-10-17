# Database loading improvements

Measured on October 17, 2026 against the configured database using read-only queries. Each result is the median of seven warm runs, alternating before and after. Times include database round trips, Node.js result handling and JSON serialization; they exclude HTTP authentication, browser rendering and cold connection setup.

| Operation | Before | After | Response/data bytes before | After |
| --- | ---: | ---: | ---: | ---: |
| Database viewer initial load | 531.30 ms | 277.98 ms | 647,337 | 2,042 |
| Database viewer, patients selected | 482.25 ms | 273.35 ms | 647,337 | 4,344 |
| Revenue queries | 274.01 ms | 269.42 ms | 911 | 555 |

The old database viewer fetched all tables, including photo bytes it never displayed. It now fetches one table, at most 50 displayed records per page, and excludes binary columns. One extra row determines whether Next is available. Tables are validated against PostgreSQL's catalog and identifiers are quoted. Existing role restrictions remain in place.

Revenue payments are grouped by date and service in SQL. Charge totals are also aggregated in SQL. The tested range, September 26 through October 10, 2026, returned 5 payment groups and 1 charge-total row instead of 7 payments and 7 charges. The resulting report matched the original report. The small timing difference is within ordinary network variation; it is not evidence of a meaningful revenue speedup on this small dataset.

The database viewer's initial response is approximately 99.7% smaller and its measured time approximately 48% lower. Payload size is not a RAM measurement; peak Node.js/PostgreSQL memory was not measured. These changes bound viewer row counts and reduce revenue rows transferred to Node.js without introducing a cache or changing PostgreSQL memory settings.

Validation: production client build, targeted client lint, four billing unit tests including aggregate equivalence and large totals, and read-only checks of database viewer data, binary exclusion, invalid table/page handling and an empty later page. The write-based PostgreSQL billing integration suite was not run.

Other list endpoints retain their current behavior. Patient photos are still available to patient screens; only the database viewer excludes them. Further pagination should be added with the corresponding screen changes rather than silently truncating existing API results.
