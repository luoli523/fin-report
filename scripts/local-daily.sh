#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STATE="$ROOT/data/local-runner"
LABEL="com.luoli.fin-report"
PLIST="$STATE/$LABEL.plist"
LINK="$HOME/Library/LaunchAgents/$LABEL.plist"
DOMAIN="gui/$(id -u)"
mkdir -p "$STATE/logs"
cd "$ROOT"
case "${1:-status}" in
  run)
    # Per-day files keep the complete run together. All configuration and logs
    # stay under this checkout; the LaunchAgents entry is only a symlink.
    LOG="$STATE/logs/$(TZ=Asia/Singapore date +%F).log"
    exec /usr/bin/caffeinate -i /opt/homebrew/bin/node --import tsx src/scripts/daily-local.ts --scheduled >> "$LOG" 2>&1
    ;;
  install)
    python3 - "$ROOT" "$PLIST" <<'PY'
import plistlib,sys
root,dest=sys.argv[1:]
data={
 'Label':'com.luoli.fin-report',
 'ProgramArguments':['/bin/bash',root+'/scripts/local-daily.sh','run'],
 'WorkingDirectory':root,
 'EnvironmentVariables':{'PATH':'/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','TZ':'Asia/Singapore'},
 'RunAtLoad':True,'StartInterval':900,
 'StartCalendarInterval':[{'Weekday':d,'Hour':7,'Minute':0} for d in range(2,7)],
 'StandardOutPath':root+'/data/local-runner/logs/launcher.log',
 'StandardErrorPath':root+'/data/local-runner/logs/launcher.log',
 'ProcessType':'Background',
}
with open(dest,'wb') as f: plistlib.dump(data,f)
PY
    mkdir -p "$(dirname "$LINK")"
    if [ -e "$LINK" ] && [ ! -L "$LINK" ]; then
      echo "Existing LaunchAgent is not our symlink: $LINK" >&2; exit 1
    fi
    ln -sfn "$PLIST" "$LINK"
    launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
    launchctl bootstrap "$DOMAIN" "$PLIST"
    echo "Installed. Execution remains gated by $STATE/enabled.json"
    ;;
  enable)
    [ -f "$PLIST" ] || { echo 'Run install first'; exit 1; }
    printf '{"enabledAt":"%s"}\n' "$(date -u +%FT%TZ)" > "$STATE/enabled.json"
    launchctl kickstart "$DOMAIN/$LABEL"
    ;;
  disable)
    rm -f "$STATE/enabled.json"
    echo 'Future scheduled runs disabled; any active run is allowed to finish.'
    ;;
  status)
    if [ -f "$STATE/enabled.json" ]; then echo 'Scheduled execution: enabled'; else echo 'Scheduled execution: disabled'; fi
    launchctl print "$DOMAIN/$LABEL" 2>/dev/null || true
    ;;
  *) echo 'Usage: scripts/local-daily.sh install|enable|disable|status|run'; exit 1 ;;
esac
