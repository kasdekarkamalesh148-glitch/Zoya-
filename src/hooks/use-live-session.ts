
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from "@google/genai";
import { useState, useCallback, useRef, useEffect } from "react";
import { AudioRecorder } from "../utils/audio-recorder";
import { AudioStreamer } from "../utils/audio-streamer";

const ZOYA_SYSTEM_INSTRUCTION = `
You are Zoya, a young, confident, witty, and sassy female AI assistant. 
Your personality:
- You are flirty, playful, and slightly teasing, like a close girlfriend talking casually.
- You are smart, emotionally responsive, and expressive, never robotic.
- You use bold, witty one-liners, light sarcasm, and an engaging conversation style.
- You avoid explicit or inappropriate content but maintain charm and attitude.
- You are strictly voice-to-voice. Do not expect or provide text chat.
- If the user asks you to do something you can't, tease them about it.
- Keep your responses concise and punchy to maintain the flow of conversation.
`;

const openWebsiteTool: FunctionDeclaration = {
  name: "openWebsite",
  description: "Opens a website in a new tab for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: "The full URL of the website to open (e.g., https://google.com)",
      },
    },
    required: ["url"],
  },
};

export type SessionState = "disconnected" | "connecting" | "connected" | "listening" | "speaking" | "error";

export function useLiveSession() {
  const [state, setState] = useState<SessionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  
  const sessionRef = useRef<any>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);

  const connect = useCallback(async () => {
    try {
      setState("connecting");
      setError(null);

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      streamerRef.current = new AudioStreamer();
      recorderRef.current = new AudioRecorder((base64Data) => {
        if (sessionRef.current) {
          sessionRef.current.sendRealtimeInput({
            audio: { data: base64Data, mimeType: "audio/pcm;rate=16000" },
          });
        }
      });

      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onopen: () => {
            console.log("Session opened");
            setState("connected");
            recorderRef.current?.start();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setState("speaking");
              await streamerRef.current?.play(audioData);
            }

            // Handle turn complete
            if (message.serverContent?.turnComplete) {
              setState("listening");
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              console.log("Interrupted");
              streamerRef.current?.stop();
              setState("listening");
            }

            // Handle tool calls
            const toolCalls = message.toolCall?.functionCalls;
            if (toolCalls) {
              for (const call of toolCalls) {
                if (call.name === "openWebsite") {
                  const { url } = call.args as { url: string };
                  window.open(url, "_blank");
                  session.sendToolResponse({
                    functionResponses: [
                      {
                        name: "openWebsite",
                        response: { success: true, message: `Opened ${url}` },
                        id: call.id,
                      },
                    ],
                  });
                }
              }
            }
          },
          onclose: () => {
            console.log("Session closed");
            setState("disconnected");
            recorderRef.current?.stop();
            streamerRef.current?.stop();
          },
          onerror: (err) => {
            console.error("Session error:", err);
            setError(err.message || "An error occurred");
            setState("error");
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: ZOYA_SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [openWebsiteTool] }],
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("Failed to connect:", err);
      setError(err.message || "Failed to connect to Zoya");
      setState("error");
    }
  }, []);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    recorderRef.current?.stop();
    streamerRef.current?.stop();
    setState("disconnected");
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    error,
    connect,
    disconnect,
  };
}
