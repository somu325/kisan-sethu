# KisanSetu Voice Assistant Architecture & Developer Guide

## 1. Overview
The KisanSetu Voice Assistant is a voice-first, data-grounded assistant designed specifically for Indian farmers. It operates with **zero LLM hallucination risk for factual agricultural queries**, resolving user speech or text into typed intents, querying local/cached repositories, and synthesizing structured cards with concise, friendly spoken responses in English, Hindi, and Telugu.

---

## 2. Pipeline & Architecture

```
                                 ┌─────────────────────────────────┐
                                 │       Farmer Audio / Text       │
                                 └────────────────┬────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │   SpeechToTextService (STT)     │
                                 │   (WebSpeech / Native Speech)   │
                                 └────────────────┬────────────────┘
                                                  │ Normalized text string
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │          IntentRouter           │
                                 │   (Multilingual Normalization)  │
                                 └────────────────┬────────────────┘
                                                  │ { intent: 'NEAREST_MANDI' | ... }
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │         IntentRegistry          │
                                 └────────────────┬────────────────┘
                                                  │ Dispatches context
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │          IntentHandler          │
                                 │ (e.g. NearestMandiHandler)      │
                                 └───────┬─────────────────┬───────┘
                                         │                 │
              Queries MarketRepository   ▼                 ▼  Haversine Distance (10->100km)
                           ┌──────────────────┐   ┌───────────────────────────┐
                           │ Grounded Mandi   │   │ Auto Search Expansion     │
                           │ Database / API   │   │ Radius: 10, 25, 50, 100km │
                           └─────────┬────────┘   └─────────────┬─────────────┘
                                     │                          │
                                     └────────────┬─────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │      IntentHandlerResponse      │
                                 │  - ChatMessage (Text + Cards)   │
                                 │  - Concise Spoken Text          │
                                 └────────────────┬────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │    TextToSpeechService (TTS)    │
                                 │   (Regional Voice Synthesis)    │
                                 └─────────────────────────────────┘
```

### Key Components:
- **`SpeechToTextService`**: Captures spoken audio with interim results, final transcript callbacks, and explicit permission error reporting.
- **`TextToSpeechService`**: Plays short, spoken-friendly responses using regional voices (`te-IN`, `hi-IN`, `en-IN`), cancellable on demand with zero voice collision.
- **`IntentRouter`**: Normalizes text and maps queries to intents (`NEAREST_MANDI`, `UNKNOWN`, and extensible for future intents).
- **`IntentRegistry`**: Decoupled registry mapping each `IntentType` to an `IntentHandler`.
- **`NearestMandiHandler`**: Grounded handler that reads farmer coordinates from shared location context, runs Haversine calculations, expands radius (10 km -> 25 km -> 50 km -> 100 km), sorts top 3 mandis, and formats card data and spoken summaries with i18n templates.
- **`FallbackHandler`**: Polite out-of-scope response with quick-action chips.
- **`ConversationRepository`**: Persists conversation turns in memory and ensures greeting is spoken only once per user session (`sessionStorage`).
- **`useVoiceAssistant`**: Master hook orchestrating STT, TTS, state machines (`idle` | `listening` | `thinking` | `speaking`), and history.

---

## 3. How to Add a New Intent & Handler (Example: Weather Advisory)

Adding a new capability takes 3 straightforward steps without touching existing handlers:

### Step 1: Define Intent in `types.ts`
```typescript
// frontend/src/features/voiceAssistant/types.ts
export type IntentType = 'NEAREST_MANDI' | 'WEATHER_ADVISORY' | 'UNKNOWN';
```

### Step 2: Add Patterns in `IntentRouter.ts`
```typescript
// frontend/src/features/voiceAssistant/router/IntentRouter.ts
const WEATHER_PATTERNS: Record<Language, RegExp[]> = {
  en: [/weather/i, /rain/i, /forecast/i, /will it rain/i],
  hi: [/मौसम/, /बारिश/, /पानी गिरेगा/, /धूप/],
  te: [/వాతావరణం/, /వర్షం/, /ఎండ/, /తుఫాను/],
};

// Inside route():
if (matchesAny(cleanText, WEATHER_PATTERNS[language])) {
  return { intent: 'WEATHER_ADVISORY', confidence: 0.95, rawText: text };
}
```

### Step 3: Implement Handler & Register in `IntentRegistry`
```typescript
// frontend/src/features/voiceAssistant/handlers/WeatherAdvisoryHandler.ts
export class WeatherAdvisoryHandler implements IntentHandler {
  async handle(ctx: IntentHandlerContext): Promise<IntentHandlerResponse> {
    const t = translations[ctx.language];
    // Fetch deterministic weather forecast for ctx.location
    const forecast = await weatherService.getForecast(ctx.location?.id);
    
    return {
      chatMessages: [{
        id: `msg_${Date.now()}`,
        role: 'assistant',
        text: `Forecast for ${ctx.location?.name[ctx.language]}: ${forecast.summary}`,
        speechText: `Today in ${ctx.location?.name[ctx.language]}, ${forecast.summary}`,
        timestamp: Date.now(),
      }],
      speechText: `Today in ${ctx.location?.name[ctx.language]}, ${forecast.summary}`,
    };
  }
}

// In useVoiceAssistant.ts or initialization:
registry.register('WEATHER_ADVISORY', new WeatherAdvisoryHandler());
```

---

## 4. Native Mobile Permissions & Packages Guide

When packaging or running KisanSetu on iOS and Android via Expo or Bare React Native, native permissions and packages must be configured:

### 1. Android Configuration
Add the microphone permission to `android/app/src/main/AndroidManifest.xml`:
```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <!-- Required for speech recognition -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

In `app.json` / `app.config.js` (for Expo):
```json
{
  "expo": {
    "plugins": [
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "Allow KisanSetu to access your microphone to ask for mandi prices and agricultural advice by voice."
        }
      ]
    ]
  }
}
```

### 2. iOS Configuration
Add microphone and speech recognition usage descriptions to `ios/KisanSetu/Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>KisanSetu needs microphone access so you can speak to find nearby mandis and crop prices.</string>

<key>NSSpeechRecognitionUsageDescription</key>
<string>KisanSetu uses speech recognition to understand your questions in Telugu, Hindi, and English.</string>
```

### 3. Recommended Native Libraries
- **Speech Synthesis (TTS)**:
  - `expo-speech` (`npx expo install expo-speech`)
  - Supports `Speech.speak(text, { language: 'te-IN' | 'hi-IN' | 'en-IN' })`
  - Fully cross-platform on iOS, Android, and Web.
- **Speech Recognition (STT)**:
  - `expo-speech-recognition` or `@react-native-voice/voice`
  - Allows streaming live recognition tokens and confidence scores across Android and iOS.
