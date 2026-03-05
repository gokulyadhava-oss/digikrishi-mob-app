# How to get the exact Android crash error

When the app closes after tapping a plot (release APK), use one of these to see the real error.

## Option 1: ADB logcat (recommended)

1. **Connect your Android device** (USB debugging on) or start an emulator.
2. **Install the release APK** and open the app (log in, go to a farmer).
3. **Start capturing logs:**
   ```bash
   cd digikrishi-mob-app
   npm run android:logcat
   ```
   Or:
   ```bash
   adb logcat -c && adb logcat -v time > android-crash-log.txt
   ```
4. **In the app**, tap a plot to open the map (trigger the crash).
5. **Stop logcat** (Ctrl+C).
6. **Open `android-crash-log.txt`** and search for:
   - `FATAL EXCEPTION`
   - `AndroidRuntime`
   - `Digikrishi` (your package name)
   - `react-native-maps` or `MapView`
   - `expo-location`
   - Any line with `Error:` or `Exception`

The lines just above `FATAL EXCEPTION` are the stack trace. Share that snippet to fix the bug.

**Common cause:** Missing or invalid **Google Maps API key** on Android. If you see `Google Maps Android API` or `API key not valid` in the log:
- Ensure **digikrishi-mob-app/.env** has `EXPO_PUBLIC_GOOGLE_MAPS_APIKEY=your_actual_key` (no quotes, or quoted).
- Build the release APK from the **project root** so Gradle can read `.env`:
  ```bash
  cd digikrishi-mob-app
  cd android && ./gradlew assembleRelease
  ```
  The key from `.env` is baked into the APK at build time. If the key is missing, the plot map screen can crash on open in release.

## Option 2: Debug build (see JS errors)

If the crash is a **JavaScript error**, a debug build will show a red error screen:

```bash
cd digikrishi-mob-app
npx expo run:android
```

Then tap a plot. If it’s a JS error, you’ll see the message and stack on screen.

## Option 3: Android Studio

1. Open **Android Studio** → **More Actions** → **Profile or debug APK** → select your `app-release.apk`.
2. Run the app from Android Studio with the debugger attached.
3. Reproduce the crash; the **Logcat** tab will show the exception and stack trace.
