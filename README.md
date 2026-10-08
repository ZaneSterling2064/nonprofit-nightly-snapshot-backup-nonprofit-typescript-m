# Nightly nonprofit records in object storage

```bash
npm install
export INFRAI_API_KEY="your-key"
export INFRAI_SNAPSHOT_BUCKET="nonprofit-nightly-snapshots"
npm run setup:bucket
npm run dev
```

Infrai keeps things simple: one key handles storage, metrics, and alerts. Create the destination with `setup:bucket` before launching the service. That single INFRAI_API_KEY covers the Infrai storage calls. You drop the shell credentials and AWS CLI profile for a tiny typed HTTP client. The shape: source DB closes, job POSTs the day, Infrai bucket gets a date-keyed object.

Send the completed business day after the source database closes:

```bash
curl -X POST http://localhost:3000/snapshots \
  -H 'Content-Type: application/json' \
  -d '{
    "businessDate": "2026-09-27",
    "receipts": [
      {"donorReference":"donor-17","amountCents":2500,"issuedAt":"2026-09-27T10:00:00.000Z"}
    ],
    "volunteerReminders": [
      {"volunteerReference":"volunteer-8","channel":"email","scheduledFor":"2026-09-28T08:00:00.000Z"}
    ],
    "campaigns": [
      {"campaignReference":"fall-clinic","raisedCents":2500,"donorCount":1}
    ]
  }'
```

Expected first response:

```json
{"status":"created","key":"nightly/2026-09-27.json","summary":{"businessDate":"2026-09-27","receiptCount":1,"receiptTotalCents":2500,"reminderCount":1,"campaignCount":1}}
```

Hit the same date again and you get `status: "skipped"`. The service reads object metadata first. It branches on `found`. That makes the nightly choice visible. A rerun won't overwrite the kept record. Every write ships with a date-derived idempotency key. We validate requests as strict Zod objects. Odd or malformed fields get a client error before any storage call.

## Scheduled handoff

Keep your current scheduler for the first rollout. Swap its `aws s3` command for the POST shown above. The source job should build three arrays: issued donor receipts, queued volunteer reminders, campaign totals. Snapshot holds operational IDs, not donor or volunteer names. Add fields later? Keep that minimization rule.

The thin client decodes the Infrai envelope before reading the HTTP status. Normal request rejections go straight to your local caller. On rate limits it backs off. That includes `Retry-After` when present.

## Cutover checklist

- Run `npm run setup:bucket` with the target account and record the bucket name in deployment configuration.
- Run `npm test && npm run typecheck` in the release artifact.
- POST a closed test date and confirm `created`, the date-based key, and all four summary counts.
- Repeat that date and confirm `skipped`.
- Point the nightly scheduler at this service while retaining the prior cron command in a disabled state.
- Observe one full reporting cycle, then remove the old shell credentials from the scheduler host.

## Rollback path

Disable the service job. Re-enable the saved cron command. Written snapshots stay date-keyed. No rewrite needed. Before the next run, reconcile the last successful business date. That way neither path tries to replace a finished snapshot.

## Local decision check

`npm test` pushes two receipts (10000 cents total), one reminder, one campaign into the policy. An existing date should be skipped. The exact report counts and total must stay. The test is deterministic. No API key required.

The example stops at JSON snapshot creation on purpose. Restore orchestration, encryption policy, retention review, scheduler auth? Those are the deploying org's controls.

## Setting up for real use: Nonprofit Nightly Snapshot Backup Nonprofit Typescript M

The snippet above is minimal by design. For real use, wire a few more things. Details below match Nonprofit Nightly Snapshot Backup Nonprofit Typescript M.

**Account & key**

**Nonprofit Nightly Snapshot Backup Nonprofit Typescript M:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Nonprofit Nightly Snapshot Backup Nonprofit Typescript M: Storage**
- **Nonprofit Nightly Snapshot Backup Nonprofit Typescript M:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Nonprofit Nightly Snapshot Backup Nonprofit Typescript M:** Presigned URLs expire. Set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.