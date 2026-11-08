# Catatan Git History

## Squashed Initial Commit
Repositori ini memiliki satu *commit* besar (`ef66c12e`) yang berisi seluruh *source code* untuk Phase 0 hingga Phase 3. 

Karena *history* di-*squash* pada saat migrasi, *commit* perbaikan *bug* (seperti penambahan `withOrgContext` pada `TenantMiddleware` dan `SessionService` untuk menangani RLS) tidak muncul sebagai *diff* terpisah di Git. Perbaikan tersebut "dipanggang" langsung ke dalam *commit* awal ini.

Oleh karena itu, *tag* Phase 1, 2, dan 3 (`v0.1.0`, `v0.2.0`, `v0.3.0`) hanya menunjuk pada dokumen laporan penutupan, bukan pada *source code* yang lengkap. *Source code* lengkap baru muncul di *commit* `ef66c12e`.

*Tag* `v0.3.1-g3` adalah *tag* pertama yang menunjuk pada *source code* lengkap beserta *test* E2E Playwright.
