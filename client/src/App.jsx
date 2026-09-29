import { useEffect, useMemo, useState } from "react";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant, useSpeakingParticipants, useTranscriptions, useVoiceAssistant,} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, Phone, PhoneOff, LoaderCircle, } from "lucide-react";

import "./App.css";


//  BUILD CALL SUMMARY
function buildSummary(messages) {
  const intentPatterns = [
    {
      intent: "ORDER_CANCELLATION",
      keywords: ["cancel", "cancellation"],
    },
    {
      intent: "RETURN_REFUND",
      keywords: ["return", "refund"],
    },
    {
      intent: "DAMAGED_PRODUCT",
      keywords: ["damaged", "defective", "broken"],
    },
    {
      intent: "ORDER_TRACKING",
      keywords: [
        "where is",
        "track",
        "tracking",
        "delivery",
        "status",
      ],
    },
    {
      intent: "SHIPPING",
      keywords: [
        "shipping",
        "delivery charge",
        "shipping charge",
      ],
    },
  ];

  
  // Helpers
  

  const normalizeOrderId = (text) => {
    if (!text) return null;

    const directMatch = text.match(
      /\b(?:ORD|ORDER)[-\s]?(\d{3})\b/i
    );

    if (directMatch) {
      return `ORD-${directMatch[1]}`;
    }

    // "one zero three" -> ORD-103
    const spokenNumbers = {
      zero: "0",
      one: "1",
      two: "2",
      three: "3",
      four: "4",
      five: "5",
      six: "6",
      seven: "7",
      eight: "8",
      nine: "9",
    };

    const spokenMatch = text
      .toLowerCase()
      .match(
        /\b(zero|one|two|three|four|five|six|seven|eight|nine)\s+(zero|one|two|three|four|five|six|seven|eight|nine)\s+(zero|one|two|three|four|five|six|seven|eight|nine)\b/
      );

    if (spokenMatch) {
      const digits = spokenMatch
        .slice(1)
        .map((word) => spokenNumbers[word])
        .join("");

      return `ORD-${digits}`;
    }

    return null;
  };

  const getIntent = (text) => {
    const lowerText = (text || "").toLowerCase();

    const matched = intentPatterns.find((item) =>
      item.keywords.some((keyword) =>
        lowerText.includes(keyword)
      )
    );

    return matched?.intent || "GENERAL_SUPPORT";
  };

  
  // 1. Get customer messages
  

  const customerMessages = messages.filter(
    (message) => message.speaker === "Customer"
  );

  
  // 2. Build individual interactions
  

  const interactions = [];

  for (let i = 0; i < customerMessages.length; i++) {
    const customerMessage = customerMessages[i];

    const text = customerMessage.text || "";

    const intent = getIntent(text);

    const orderId = normalizeOrderId(text);

    // Ignore completely unrelated/general messages
    // unless they contain an order ID.
    if (
      intent === "GENERAL_SUPPORT" &&
      !orderId
    ) {
      continue;
    }

    // Find Aria's response after this customer message.
    const customerIndex = messages.indexOf(
      customerMessage
    );

    let ariaResponse = "";

    for (
      let j = customerIndex + 1;
      j < messages.length;
      j++
    ) {
      if (messages[j].speaker === "Customer") {
        break;
      }

      if (messages[j].speaker === "Aria") {
        ariaResponse +=
          `${messages[j].text || ""} `;
      }
    }

    ariaResponse = ariaResponse.trim();

    
    // Resolution
    

    let resolution_status = "RESOLVED";

    const unresolvedPatterns = [
      "sorry",
      "couldn't locate",
      "could not locate",
      "not eligible",
      "please provide",
      "please verify",
      "could you repeat",
      "i didn't hear",
      "i did not hear",
      "unclear",
      "not enough information",
    ];

    if (
      unresolvedPatterns.some((pattern) =>
        ariaResponse.toLowerCase().includes(pattern)
      )
    ) {
      resolution_status = "UNRESOLVED";
    }

    
    // Generate individual summary
    

    let summary = "Customer contacted Aura Skincare support.";

    if (
      intent === "ORDER_TRACKING" &&
      orderId
    ) {
      summary =
        `Customer asked about the delivery status of ${orderId}. ` +
        `Aria provided the available order information.`;
    }

    else if (
      intent === "ORDER_CANCELLATION" &&
      orderId
    ) {
      const conversationText =
        `${text} ${ariaResponse}`.toLowerCase();

      if (
        conversationText.includes("cancelled") ||
        conversationText.includes("canceled")
      ) {
        summary =
          `Customer requested cancellation of ${orderId}. ` +
          `Aria confirmed the cancellation.`;
      } else {
        summary =
          `Customer asked to cancel ${orderId}. ` +
          `Aria checked the cancellation eligibility and responded according to the order status.`;
      }
    }

    else if (
      intent === "RETURN_REFUND"
    ) {
      summary =
        "Customer asked about Aura Skincare's return or refund policy. " +
        "Aria responded according to the brand policy.";
    }

    else if (
      intent === "DAMAGED_PRODUCT"
    ) {
      summary =
        "Customer reported a damaged or defective product. " +
        "Aria explained the replacement policy and required information.";
    }

    else if (
      intent === "SHIPPING"
    ) {
      summary =
        "Customer asked about Aura Skincare's shipping policy or delivery charges. " +
        "Aria provided the relevant shipping information.";
    }

    interactions.push({
      customer_intent: intent,
      order_id: orderId,
      resolution_status,
      call_summary: summary,
    });
  }

  
  // 3. If nothing useful was detected
  

  if (interactions.length === 0) {
    return {
      customer_intent: "GENERAL_SUPPORT",
      order_id: null,
      resolution_status: "RESOLVED",
      call_summary:
        "Customer contacted Aura Skincare support.",
      interactions: [],
    };
  }

  
  // 4. Backward-compatible top-level fields
  

  const firstInteraction = interactions[0];

  const uniqueIntents = [
    ...new Set(
      interactions.map(
        (item) => item.customer_intent
      )
    ),
  ];

  const uniqueOrderIds = [
    ...new Set(
      interactions
        .map((item) => item.order_id)
        .filter(Boolean)
    ),
  ];

  const overallResolution = interactions.every(
    (item) =>
      item.resolution_status === "RESOLVED"
  )
    ? "RESOLVED"
    : "UNRESOLVED";

  
  // 5. Combined call summary
  

  const combinedSummary =
    interactions
      .map(
        (item) => item.call_summary
      )
      .join(" ");

  return {
    // Keep these fields so existing UI still works
    customer_intent:
      uniqueIntents.length === 1
        ? uniqueIntents[0]
        : uniqueIntents,

    order_id:
      uniqueOrderIds.length === 0
        ? null
        : uniqueOrderIds.length === 1
        ? uniqueOrderIds[0]
        : uniqueOrderIds,

    resolution_status: overallResolution,

    call_summary: combinedSummary,

    // NEW
    interactions,
  };
}

//  VOICE INTERFACE
function VoiceInterface({ onEndCall }) {
  const { localParticipant } = useLocalParticipant();
  const { state: agentState } = useVoiceAssistant();
  const activeSpeakers = useSpeakingParticipants();
  const transcriptions = useTranscriptions();

  const [micEnabled, setMicEnabled] = useState(true);

  
    //  MICROPHONE STATE
  

  useEffect(() => {
    if (!localParticipant) return;

    setMicEnabled(
      localParticipant.isMicrophoneEnabled
    );
  }, [localParticipant]);

  
    //  VOICE STATE
  

  const voiceState =
    agentState === "speaking"
      ? "speaking"
      : agentState === "thinking"
      ? "thinking"
      : "listening";

 
    //  CUSTOMER SPEAKING DETECTION

    //  The waveform below the orb is active only when the
    //  customer's LiveKit participant is an active speaker.
  

  const customerIsSpeaking =
    !!localParticipant &&
    activeSpeakers.some(
      (participant) =>
        participant.identity === localParticipant.identity
    );

  
    //  TRANSCRIPT
  

  const transcriptMessages = useMemo(() => {
    const localId = localParticipant?.identity;
    const seen = new Map();

    for (const item of transcriptions || []) {
      const text = (item?.text || "").trim();

      if (!text) continue;

      const id =
        item?.streamInfo?.id ||
        `${item?.participantInfo?.identity}-${item?.streamInfo?.timestamp}-${text}`;

      const speaker =
        item?.participantInfo?.identity === localId
          ? "Customer"
          : "Aria";

      seen.set(id, {
        id,
        speaker,
        text,
        timestamp:
          item?.streamInfo?.timestamp || Date.now(),
      });
    }

    return [...seen.values()].sort(
      (a, b) => a.timestamp - b.timestamp
    );
  }, [
    transcriptions,
    localParticipant?.identity,
  ]);

// MICROPHONE TOGGLE
  

  const toggleMic = async () => {
    if (!localParticipant) return;

    try {
      const next =
        !localParticipant.isMicrophoneEnabled;

      await localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
    } catch (error) {
      console.error(
        "Microphone toggle failed:",
        error
      );
    }
  };

 
    //  END CALL
  

  const finishCall = () => {
    onEndCall(transcriptMessages);
  };


    //  UI
  

  return (
    <div className="voice-page">
      {/* HEADER */}
      <header className="voice-header">
        <div className="brand">
          <div>
            <h1>Aura Skincare</h1>
            <span>AI Customer Support</span>
          </div>
        </div>

        <div className="live-label">Live</div>
      </header>

      {/* MAIN */}
      <main className="voice-main">
        {/* VOICE ORB */}
        <div className={`voice-orb ${voiceState}`}>
          <div className="orb-ring ring-one" />
          <div className="orb-ring ring-two" />

          <div className="orb-core">
            {voiceState === "listening" && (
              <Mic size={34} />
            )}

            {voiceState === "thinking" && (
              <LoaderCircle
                size={34}
                className="spin"
              />
            )}

            {voiceState === "speaking" && (
              <div className="sound-bars">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            )}
          </div>
        </div>

        {/* CUSTOMER VOICE WAVEFORM */}
        <div
          className={`waveform ${
            customerIsSpeaking
              ? "customer-speaking"
              : ""
          }`}
          aria-label={
            customerIsSpeaking
              ? "Customer is speaking"
              : "Waiting for customer"
          }
        >
          {Array.from({ length: 28 }).map(
            (_, index) => (
              <span
                key={index}
                style={{
                  animationDelay: `${
                    index * 0.035
                  }s`,
                }}
              />
            )
          )}
        </div>
      </main>

      {/* CONTROLS */}
      <footer className="voice-controls">
        <button
          type="button"
          className={`mic-button ${
            !micEnabled ? "muted" : ""
          }`}
          onClick={toggleMic}
        >
          {micEnabled ? (
            <Mic size={22} />
          ) : (
            <MicOff size={22} />
          )}
        </button>

        <button
          type="button"
          className="end-call-button"
          onClick={finishCall}
        >
          <PhoneOff size={20} />
          End Call
        </button>
      </footer>

      <RoomAudioRenderer />
    </div>
  );
}

//  CALL SUMMARY
function CallSummary({
  messages,
  summary,
  onNewCall,
}) {
  return (
    <div className="summary-page">
      <div className="summary-header">
        <div>
          <p className="eyebrow">
            AURA SKINCARE
          </p>
          <h1>Call Summary</h1>
        </div>

        <button
          type="button"
          className="new-call-button"
          onClick={onNewCall}
        >
          <Phone size={18} />
          New Call
        </button>
      </div>

      <div className="summary-grid">
        <section className="summary-card">
          <h2>Structured Outcome</h2>

          <pre>
            {JSON.stringify(
              summary,
              null,
              2
            )}
          </pre>
        </section>

        <section className="summary-card transcript-card">
          <h2>Call Transcript</h2>

          {messages.length === 0 ? (
            <p className="empty">
              No transcript was captured.
            </p>
          ) : (
            messages.map((message) => (
              <div
                className={`message ${
                  message.speaker === "Customer"
                    ? "customer"
                    : "aria"
                }`}
                key={message.id}
              >
                <span>{message.speaker}</span>
                <p>{message.text}</p>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

//  MAIN APP
export default function App() {
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [callResult, setCallResult] = useState(null);

  
//  START CALL
  const startCall = async () => {
    try {
      setLoading(true);
      setCallResult(null);

      const response = await fetch(
        "http://localhost:5000/api/livekit/token"
      );

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message ||
            "Failed to create LiveKit token"
        );
      }

      setToken(data.token);
      setServerUrl(data.url);
      setConnected(true);
    } catch (error) {
      console.error(
        "Failed to start call:",
        error
      );

      alert(
        "Unable to start call. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  
//  END CALL
  const endCall = (messages = []) => {
    const cleanMessages = messages.map(
      ({ id, speaker, text, timestamp }) => ({
        id,
        speaker,
        text,
        timestamp,
      })
    );

    setCallResult({
      messages: cleanMessages,
      summary: buildSummary(cleanMessages),
    });

    setConnected(false);
    setToken("");
    setServerUrl("");
  };

  
//  NEW CALL
  const newCall = () => {
    setCallResult(null);
  };

  
//  SUMMARY SCREEN
  if (callResult) {
    return (
      <CallSummary
        messages={callResult.messages}
        summary={callResult.summary}
        onNewCall={newCall}
      />
    );
  }

  
 //  LIVEKIT CALL
  if (connected && token && serverUrl) {
    return (
      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect={true}
        audio={true}
        video={false}
      >
        <VoiceInterface onEndCall={endCall} />
      </LiveKitRoom>
    );
  }

//  LANDING PAGE
return (
    <div className="landing-page">
      <main className="landing-content">
        <p className="eyebrow">
          AURA SKINCARE
        </p>

        <h1>
          Talk to <span>Aria</span>
        </h1>

        <p className="landing-description">
          Your AI skincare support assistant.
          Ask about orders, delivery,
          returns, cancellations, and more.
        </p>

        <button
          type="button"
          className="start-call-button"
          onClick={startCall}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle
              size={20}
              className="spin"
            />
          ) : (
            <Phone size={20} />
          )}

          {loading
            ? "Connecting..."
            : "Start Call"}
        </button>

        <div className="examples">
          <span>Try asking</span>

          <p>
            "Where is my order ORD-101?"
          </p>

          <p>
            "Can I cancel ORD-103?"
          </p>

          <p>
            "What's your return policy?"
          </p>
        </div>
      </main>
    </div>
  );
}
