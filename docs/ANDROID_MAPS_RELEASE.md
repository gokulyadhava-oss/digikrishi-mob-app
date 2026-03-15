# Android release build: map shows white screen

On Android **release** builds, the map can appear fully white even though the rest of the app works. Debug builds are fine.

## Local release build (`./gradlew assembleRelease`)

From project root you can run:

```bash
npm run android:release
```

Use `npm run android:release` so the Expo config step doesn’t warn. Use `npm run android:release` from the project root so `.env` is loaded (backend URL and Maps key). Running `./gradlew assembleRelease` from the `android` folder does not load `.env` for the JS bundle, so the app would use localhost and requests fail on device.

If the map is still white, use the SHA-1 fix below (your release build may be signed with the debug keystore; if so, that SHA-1 must be in Google Cloud).

---

## Cause (white map)

Google Maps SDK checks your app’s **SHA-1 certificate**.  
Debug builds use the **debug keystore** SHA-1. Release builds use the **release keystore** (or Play App Signing) SHA-1.  
If the API key in Google Cloud is restricted to “Android apps” and only the **debug** SHA-1 was added, release builds are rejected and the map stays white (no errors in app).

## Fix

1. **Get the SHA-1 used by your release build**
   - **Local release keystore:**  
     `keytool -list -v -keystore path/to/your-release.keystore -alias your-key-alias`
   - **EAS / Play App Signing:**  
     In [Google Play Console](https://play.google.com/console) → Your app → **Release** → **Setup** → **App integrity** → **App signing**: copy the **SHA-1 certificate fingerprint** (this is what Google uses for Play-distributed builds).

2. **Add it to your Maps API key**
   - Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
   - Open the credential used for Maps (the one referenced by `EXPO_PUBLIC_GOOGLE_MAPS_APIKEY`).
   - Under **Application restrictions** → **Android apps**, add (or edit) an entry:
     - **Package name:** `Digikrishi.Mobile.Aoo` (from `app.json`).
     - **SHA-1:** paste the **release** SHA-1 from step 1.
   - Keep the **debug** SHA-1 there if you still want maps in debug builds.
   - Save.

3. **Rebuild and test**
   - Create a new release build and install it.
   - Wait a few minutes after changing the key so Google’s servers update.
   - If it was cached, clear app data or reinstall the app.

## Summary

| Build type | Keystore / SHA-1 source        | Must be in API key restrictions |
|-----------|---------------------------------|----------------------------------|
| Debug     | Debug keystore                  | Yes (if you use debug builds)   |
| Release   | Release keystore or Play signing| **Yes** (required for release)   |

Once the **release** SHA-1 is added to the same API key and package name, the map should load in the release build.
