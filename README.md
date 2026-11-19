# ATTENDANCE — a living pulse

An Awwwards-standard attendance system: HTML + Node.js + MySQL.

## Run

```sh
npm install
npm start
# open http://localhost:3000
```

## Database

This project expects a MySQL server on `127.0.0.1:3310` (see `.env`).
A local dev instance was initialized at `/tmp/opencode/mysqldata` (root, no password)
with database `attendance` and seed data. Start it with:

```sh
mysqld --user=ammar --basedir=/usr \
  --datadir=/tmp/opencode/mysqldata/data \
  --socket=/tmp/opencode/mysqldata/run/mysql.sock \
  --port=3310 --daemonize
```

Schema + seed: `mysql ... < schema.sql` (see `db.js` pool config).

## Awwwards craft notes

- Concept: "the workday, breathing" — attendance as a living pulse.
- Signature moment: hero pulse canvas (heartbeat spike on each check-in) + day-presence ring.
- Tokens, fluid type scale, single accent (#d8f34a), Lenis + GSAP, prefers-reduced-motion honoured.
- Performance: LCP target <1.5s, page weight <3MB, 60fps on throttled mid-range.
