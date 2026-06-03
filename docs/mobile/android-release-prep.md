# Android Release Prep

## Open in Android Studio
Open this folder in Android Studio:
- `frontend/android`

## Required Local Setup
- JDK: Android Studio bundled JBR
  - `C:\Program Files\Android\Android Studio\jbr`
- Android SDK:
  - `C:\Users\MJ\AppData\Local\Android\Sdk`
- Signing config:
  - `frontend/android/key.properties`
  - `frontend/android/keystore/mightycouple-release.jks`

## Signed Build Outputs
- Signed AAB:
  - `frontend/android/app/build/outputs/bundle/release/app-release.aab`
- Signed APK:
  - `frontend/android/app/build/outputs/apk/release/app-release.apk`

## Play Store Metadata
See:
- `docs/mobile/android-play-store-metadata.md`
- Feature graphic draft:
  - `docs/mobile/assets/android-feature-graphic.png`

## Release Checklist
1. Open the Android project in Android Studio.
2. Sync Gradle.
3. Confirm signing config is present.
4. Build release AAB.
5. Build release APK for direct device testing.
6. Review app icon, label, and launcher appearance.
7. Prepare Play Console listing:
   - title
   - short description
   - full description
   - screenshots
   - feature graphic
   - privacy policy
   - support email
8. Upload signed AAB to Play Console.
9. Test internal release on a device.

## Notes
- Use the same branding assets as the web store for consistency.
- Keep version code incremented for every new Play Store release.
