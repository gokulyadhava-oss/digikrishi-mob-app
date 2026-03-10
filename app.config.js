// EXPO_PUBLIC_GOOGLE_MAPS_APIKEY from .env is used for Google Maps (Android/iOS).
// If the map is white on Android release: add the RELEASE build SHA-1 to the API key
// in Google Cloud Console (see docs/ANDROID_MAPS_RELEASE.md).
const base = require('./app.json');

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY ?? '';

module.exports = {
  expo: {
    ...base.expo,
    android: {
      ...base.expo.android,
      config: {
        ...(base.expo.android?.config || {}),
        googleMaps: { apiKey: googleMapsApiKey },
      },
    },
    ios: {
      ...base.expo.ios,
      config: {
        ...(base.expo.ios?.config || {}),
        googleMapsApiKey,
      },
    },
  },
};
