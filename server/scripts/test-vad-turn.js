import "dotenv/config";
import { inference, initializeLogger, VADEventType } from "@livekit/agents";
import * as silero from "@livekit/agents-plugin-silero";
import { AudioFrame } from "@livekit/rtc-node";

// Test Silero VAD + the default InferenceTurnDetector (turn-detector-v1,
// cloud) with real speech audio synthesized through the working gateway TTS.

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTestAudio() {
  const tts = new inference.TTS({
    model: "inworld/inworld-tts-2",
    voice: "Ashley",
    language: "en-IN",
    modelOptions: { delivery_mode: "STABLE", speaking_rate: 1.0, apply_text_normalization: "ON" },
  });
  const stream = tts.stream();
  stream.pushText("Hi. I want to track my order ORD one zero one.");
  stream.endInput();

  const frames = [];
  let rate = 0;
  for await (const audio of stream) {
    if (!audio || !audio.frame) continue;
    const f = audio.frame;
    rate = f.sampleRate;
    frames.push(f.data);
  }
  stream.close?.();
  if (frames.length === 0) throw new Error("no TTS audio");
  return { frames, rate };
}

function pushFrames(vadStream, frames, rate, withSilence=true) {
  const CHUNK = 320;
  const push = (data) => {
    for (let off = 0; off < data.length; off += CHUNK) {
      const end = Math.min(off + CHUNK, data.length);
      const chunk = data.subarray(off, end);
      vadStream.pushFrame(new AudioFrame(chunk, rate, 1, chunk.length));
    }
  };
  for (const data of frames) push(data);
  if (withSilence) {
    const silenceSamples = Math.round(rate * 1.5);
    push(new Int16Array(silenceSamples)); // ~1.5s trailing silence
  }
}

async function testVad(frames, rate) {
  console.log("=== SILERO VAD ===");
  const vad = await silero.VAD.load();
  const stream = vad.stream();
  const events = [];
  const reader = (async () => {
    for await (const ev of stream) {
      events.push(ev);
      const name = Object.keys(VADEventType).find((k) => VADEventType[k] === ev.type);
      console.log(`  VAD event: ${name}`);
    }
  })();

  pushFrames(stream, frames, rate);
  await sleep(2500);
  stream.close();
  await reader.catch(() => {});

  const starts = events.filter((e) => e.type === VADEventType.START_OF_SPEECH);
  const ends = events.filter((e) => e.type === VADEventType.END_OF_SPEECH);
  console.log(`  VAD result: ${starts.length} START_OF_SPEECH, ${ends.length} END_OF_SPEECH`);
  await vad.close?.().catch(() => {});
  return starts.length > 0 && ends.length > 0;
}

async function testTurnDetector(frames, rate) {
  console.log("=== DEFAULT INFERENCE TURN DETECTOR (turn-detector-v1) ===");
  const detector = new inference.TurnDetector();
  console.log(`  Detector initial model: ${detector.model}`);

  const stream = detector.stream();
  const predictions = [];

  const CHUNK = 320;
  for (const data of frames) {
    for (let off = 0; off < data.length; off += CHUNK) {
      const end = Math.min(off + CHUNK, data.length);
      const chunk = data.subarray(off, end);
      stream.pushAudio(new AudioFrame(chunk, rate, 1, chunk.length));
      await sleep(2);
    }
  }
  // Push trailing silence so the detector sees an end-of-utterance window.
  const silence = new Int16Array(rate);
  for (let off = 0; off < silence.length; off += CHUNK) {
    const end = Math.min(off + CHUNK, silence.length);
    stream.pushAudio(new AudioFrame(silence.subarray(off, end), rate, 1, end - off));
    await sleep(2);
  }

  try {
    const fut = stream.predict();
    const result = await Promise.race([fut, sleep(8000).then(() => "timeout")]);
    if (result === "timeout") {
      console.log("  EOT prediction: TIMEOUT (no cloud prediction)");
      stream.cancelInference?.({ timedOut: true });
    } else {
      predictions.push(result);
      console.log(`  EOT prediction: prob=${result.endOfTurnProbability.toFixed(3)}`);
      console.log(`  EOT model after predict: ${stream.model}`);
    }
  } catch (e) {
    console.log(`  EOT error: ${e.message}`);
    console.log(`  EOT model after error: ${stream.model}`);
  } finally {
    await stream.aclose?.().catch(() => {});
    await detector.aclose?.().catch(() => {});
  }

  return predictions.length > 0;
}

async function run() {
  initializeLogger({ level: "info", pretty: false });
  requireEnv("LIVEKIT_API_KEY");
  requireEnv("LIVEKIT_API_SECRET");

  const { frames, rate } = await getTestAudio();
  console.log(`Test audio: ${frames.reduce((t, d) => t + d.length, 0)} samples @ ${rate} Hz`);

  await testVad(frames, rate);
  console.log("");
  await testTurnDetector(frames, rate);
  console.log("DONE");
  process.exit(0);
}

run().catch((e) => {
  console.error("FAIL", e);
  process.exit(1);
});