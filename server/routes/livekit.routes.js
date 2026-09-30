import express from "express";
import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";

const router = express.Router();

router.get("/token", async (req, res) => {
  try {
    const { LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL } =
      process.env;

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return res.status(500).json({
        success: false,
        message:
          "LiveKit server configuration is missing on the backend. " +
          "Check LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET.",
      });
    }

    // Create a unique room for every call
    const roomName = `aura-room-${Date.now()}`;

    const participantName =
      req.query.name || `customer-${Date.now()}`;

    const token = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity: participantName,
        ttl: "30m", // short-lived token, refreshed per call
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    // Explicitly dispatch Aura AI agent into the room.
    // Keep this — it is how the deployed "aura-agent" is invoked.
    token.roomConfig = new RoomConfiguration({
      agents: [
        new RoomAgentDispatch({
          agentName: "aura-agent",
        }),
      ],
    });

    const jwt = await token.toJwt();

    res.json({
      success: true,
      token: jwt,
      url: LIVEKIT_URL,
      roomName,
    });
  } catch (error) {
    console.error("LiveKit token error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create LiveKit token",
    });
  }
});

export default router;