#!/bin/sh
set -e
echo "→ Bắt đầu migration..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, run_at TIMESTAMPTZ DEFAULT now());"

for f in /migrations/[0-9]*.sql; do
  name=$(basename "$f")
  done=$(psql "$DATABASE_URL" -tAc "SELECT 1 FROM _migrations WHERE name='$name'")
  if [ "$done" = "1" ]; then
    echo "  ✓ $name (đã chạy, bỏ qua)"
  else
    echo "  → đang chạy $name ..."
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
    psql "$DATABASE_URL" -c "INSERT INTO _migrations(name) VALUES ('$name');"
    echo "  ✓ $name xong"
  fi
done
echo "→ Migration hoàn tất."
