import "dotenv/config";
import { inference, initializeLogger, stt as agentSTT } from "@livekit/agents";
import { AudioFrame } from "@livekit/rtc-node";

// Validate the EXACT provider stack used by aura-agent against the LiveKit
// Cloud inference gateway WITHOUT touching the deployed agent:
//   1. Inworld TTS-2   -> synthesizes a test phrase (proves gateway auth + TTS)
//   2. Deepgram Nova-3 -> transcribes the phrase with language "en-IN"
//
// Usage (from server/):  node scripts/test-voice-pipeline.js

const TEST_PHRASE = "Hi, I want to track my order ORD one zero one.";

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} - required by the LiveKit inference gateway.`);
  return value;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const typeName = (type) =>
  Object.keys(agentSTT.SpeechEventType).find(
    (key) => agentSTT.SpeechEventType[key] === type
  ) ?? String(type);

async function run() {
  initializeLogger({ level: "info", pretty: false });

  requireEnv("LIVEKIT_API_KEY");
  requireEnv("LIVEKIT_API_SECRET");

  console.log("=== STEP 1: Inworld TTS-2 synthesis (via LiveKit inference) ===");

  const tts = new inference.TTS({
    model: "inworld/inworld-tts-2",
    voice: "Ashley",
    language: "en-IN",
    modelOptions: {
      delivery_mode: "STABLE",
      speaking_rate: 1.0,
      apply_text_normalization: "ON",
    },
  });

  const ttsStream = tts.stream();
  ttsStream.pushText(TEST_PHRASE);
  ttsStream.endInput();

  const ttsFrames = [];
  let ttsSampleRate = 0;
  let ttsChannels = 1;
  const TTS_TIMEOUT_MS = 45000;
  const ttsDeadline = Date.now() + TTS_TIMEOUT_MS;

  for await (const audio of ttsStream) {
    if (Date.now() > ttsDeadline) throw new Error("TTS timed out");
    if (!audio || !audio.frame) continue; // END_OF_STREAM sentinel
    const frame = audio.frame;
    if (!ttsSampleRate) {
      ttsSampleRate = frame.sampleRate;
      ttsChannels = frame.channels;
      console.log(`  TTS format: ${frame.sampleRate} Hz, ${frame.channels} ch`);
    }
    ttsFrames.push(frame.data);
  }

  if (ttsFrames.length === 0) throw new Error("TTS produced no audio");

  const ttsSamples = ttsFrames.reduce((total, data) => total + data.length, 0);
  console.log(`  TTS produced ${ttsSamples} samples @ ${ttsSampleRate} Hz`);
  console.log(`  Duration: ${(ttsSamples / ttsSampleRate).toFixed(2)}s`);

  if (ttsSampleRate !== 16000 || ttsChannels !== 1) {
    throw new Error(`Unexpected TTS format ${ttsSampleRate}/${ttsChannels}; expected 16000/mono`);
  }

  console.log("=== STEP 2: Deepgram Nova-3 (en-IN) transcription ===");

  const stt = new inference.STT({
    model: "deepgram/nova-3",
    language: "en-IN",
  });

  const sttStream = stt.stream();
  const events = [];

  const reader = (async () => {
    for await (const event of sttStream) {
      events.push(event);
      const text = event.alternatives?.[0]?.text ?? "";
      console.log(`  STT [${typeName(event.type)}]: "${text}"`);
    }
  })();

  // Feed 20ms chunks (320 samples @ 16 kHz) exactly like a real mic stream.
  const CHUNK = 320;
  for (const data of ttsFrames) {
    for (let offset = 0; offset < data.length; offset += CHUNK) {
      const end = Math.min(offset + CHUNK, data.length);
      const chunk = data.subarray(offset, end);
      sttStream.pushFrame(new AudioFrame(chunk, 16000, 1, chunk.length));
    }
  }
  sttStream.endInput();

  const STT_TIMEOUT_MS = 30000;
  const sttDeadline = Date.now() + STT_TIMEOUT_MS;

  while (Date.now() < sttDeadline) {
    const finals = events.filter(
      (event) =>
        event.type === agentSTT.SpeechEventType.FINAL_TRANSCRIPT ||
        event.type === agentSTT.SpeechEventType.END_OF_SPEECH
    );
    if (finals.length > 0) break;
    await sleep(250);
  }

  ttsStream.close?.();
  await reader.catch(() => {});

  const finals = events.filter(
    (event) =>
      event.type === agentSTT.SpeechEventType.FINAL_TRANSCRIPT ||
      event.type === agentSTT.SpeechEventType.END_OF_SPEECH
  );

  console.log("=== RESULT ===");

  if (finals.length === 0) {
    console.log("FAIL: NO FINAL TRANSCRIPT PRODUCED");
    console.log("Full event stream:");
    for (const event of events) console.log("  ", event);
    process.exit(1);
  }

  const transcript = finals
    .map((event) => event.alternatives?.[0]?.text ?? "")
    .join(" ")
    .trim();

  console.log(`PASS: STT transcript = "${transcript}"`);
  console.log('Expected:            "Hi, I want to track my order ORD 101."');
  process.exit(0);
}

run().catch((error) => {
  console.error("FAIL: pipeline test error");
  console.error(error);
  process.exit(1);
});