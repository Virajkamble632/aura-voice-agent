import express from "express";
import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";

const router = express.Router();

router.get("/token", async (req, res) => {
  try {
    // Create a unique room for every call
    const roomName = `aura-room-${Date.now()}`;

    const participantName =
      req.query.name || `customer-${Date.now()}`;

    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantName,
      }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // Explicitly dispatch Aura AI agent
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
      url: process.env.LIVEKIT_URL,
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