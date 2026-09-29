# zalo-personal-bridge/MIGRATION.md
# Bridge Migration Guide — Legacy → TypeScript

> `server.js` cũ đã được đổi tên thành `server.js.legacy` và sẽ bị xóa sau khi
> xác nhận TypeScript bridge hoạt động hoàn toàn trong production.

## Lý do chuyển đổi

| Vấn đề của `server.js.legacy` | Giải pháp trong TypeScript bridge |
|-------------------------------|----------------------------------|
| Hard-code `CHATWOOT_API_TOKEN` | Đọc từ ENV, không có fallback |
| Không có rate limiting | `src/workers/send-rate-limiter.ts` |
| Không có HMAC verification | `src/security/hmac-verifier.ts` |
| Không có encryption session | `src/security/envelope-cipher.ts` |
| Single file 3000+ dòng | Modular architecture |
| No TypeScript types | Full TypeScript strict mode |
| Puppeteer dependency (heavy) | zca-js native |
| Không có replay protection | `src/security/replay-guard.ts` |
| Không có metrics | `src/telemetry/metrics.ts` |
| Không có reconnect policy | `src/sessions/reconnect-policy.ts` |

## Checklist trước khi xóa server.js.legacy

- [ ] TypeScript bridge deploy thành công ở staging
- [ ] Tất cả Zalo sessions đã được migrate sang Postgres persistence
- [ ] Rate limiting hoạt động đúng (không có flood error)
- [ ] HMAC verification hoạt động với KChat Rails backend
- [ ] Đã test QR flow hoàn chỉnh
- [ ] Monitoring và alerting đã được cấu hình

## Xóa file khi đủ điều kiện

```bash
git rm zalo-personal-bridge/server.js.legacy
git commit -m "chore: remove legacy Zalo bridge (server.js)"
```
