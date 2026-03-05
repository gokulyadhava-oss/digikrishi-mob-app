#!/usr/bin/env bash
# Capture Android crash logs when you reproduce the plot screen crash.
#
# Usage:
#   1. Connect your Android device (or start emulator).
#   2. Install and open the release APK; log in and go to a farmer.
#   3. Run:   npm run android:logcat   (or ./scripts/capture-android-crash.sh)
#   4. In the app, tap a plot to open the map (trigger the crash).
#   5. When the app crashes, press Ctrl+C in this terminal.
#   6. Open android-crash-log.txt and search for "FATAL", "Error", "Exception",
#      or your app package (Digikrishi.Mobile.Aoo) to see the exact error.
#
set -e
LOG_FILE="${1:-android-crash-log.txt}"
echo "Clearing logcat and capturing to $LOG_FILE ..."
echo "Reproduce the crash (tap a plot), then press Ctrl+C."
echo ""
adb logcat -c
adb logcat -v time "*:V" 2>&1 | tee "$LOG_FILE"
