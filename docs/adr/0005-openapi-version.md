# ADR-0005: OpenAPI 3.0.0 vs 3.1.0

Status: Accepted (Phase 0)
Date: 2026-11-08

## Context
NestJS Swagger (`@nestjs/swagger`) secara default menghasilkan OpenAPI 3.0.0. Spesifikasi awal proyek meminta OpenAPI 3.1 (yang mendukung `type: ["string", "null"]`, `examples` di schema, dan JSON Schema 2020-12).

## Decision
Kita menggunakan OpenAPI 3.0.0 untuk Phase 0 dan 1. 

## Consequences
- Semua endpoint saat ini ter-represent dengan benar di 3.0.0.
- Jika di Phase 2/3 kita butuh fitur spesifik 3.1 (misalnya untuk *code generation* SDK yang lebih ketat), kita perlu melakukan *upgrade* library Swagger atau meng-*override* generator-nya.
- Sampai saat itu, ini dicatat sebagai *tech debt*.
