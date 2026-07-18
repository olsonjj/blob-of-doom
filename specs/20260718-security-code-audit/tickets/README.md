# Tickets — Security & Code Quality Remediation

**Parent spec:** `../implementation-spec.md`  
**Audit:** `../audit.md`

## Overview

| Wave | Tickets | Priority | Effort | Parallel |
|------|---------|----------|--------|----------|
| [Wave 1](wave-1/) | SEC-001, SEC-002, SEC-003 | 🔴 Fix Now | ~1h | ✅ |
| [Wave 2](wave-2/) | SEC-004, SEC-005, SEC-006 | 🟠 Fix Soon | ~4.5h | ✅ |
| [Wave 3](wave-3/) | SEC-007, SEC-008, SEC-009, SEC-010 | 🟡 Cleanup | ~2h | ❌ (sequential) |
| [Wave 4](wave-4/) | SEC-011, SEC-012, SEC-013 | 🟡 Cleanup | ~2h | ✅ |
| [Wave 5](wave-5/) | SEC-014, SEC-015 | 🔵 Defer | ~7h | ✅ |

## Dependency Graph

```
SEC-001 (admin guard)     ── independent
SEC-002 (static import)   ── independent
SEC-003 (flagged count)   ── independent
SEC-004 (TOCTOU race)     ── depends on SEC-003 (same file, avoid conflicts)
SEC-005 (moderation)      ── independent
SEC-006 (silent catches)  ── independent
SEC-007 (rating upsert)   ── independent
SEC-008 (orphaned blobs)  ── depends on SEC-004 (same file)
SEC-009 (delete ordering) ── independent
SEC-010 (soft-delete)     ── depends on SEC-009 (same function)
SEC-011 (JSON.parse)      ── independent, do last in cleanup tier
SEC-012 (Proxy types)     ── independent
SEC-013 (shared constants)── independent
SEC-014 (admin decompose) ── independent, defer
SEC-015 (test coverage)   ── independent, defer
```

## Execution Order

```
Wave 1 (parallel):  SEC-001, SEC-002, SEC-003
Wave 2 (parallel):  SEC-004, SEC-005, SEC-006
Wave 3 (sequential): SEC-007 → SEC-008 → SEC-009 → SEC-010
Wave 4 (parallel):  SEC-011, SEC-012, SEC-013
Wave 5 (deferred):  SEC-014, SEC-015
```
