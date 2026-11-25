import { useState, useRef, useEffect } from "react";
import axios from "axios";
import {
  Send,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Stethoscope,
  CalendarSearch,
  CalendarPlus,
  CalendarX
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const API_URL = "http://127.0.0.1:8000/api";

const suggestions = [
  { label: "Find a doctor", icon: Stethoscope },
  { label: "Check available slots", icon: CalendarSearch },
  { label: "Book an appointment", icon: CalendarPlus },
  { label: "Cancel an appointment", icon: CalendarX }
];

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! Welcome to MediAssist. I can help you find doctors, check available slots, book appointments or cancel an existing appointment. You can type or speak to me. How can I help you today?"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [status, setStatus] = useState("Ready to assist you");

  const bottomRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const speakResponse = async (text: string) => {
    let audioUrl = "";

    try {
      setSpeaking(true);

      const formData = new FormData();
      formData.append("text", text);

      const response = await axios.post(
        `${API_URL}/voice/speak`,
        formData,
        { responseType: "blob" }
      );

      audioUrl = URL.createObjectURL(response.data);

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setSpeaking(false);
        setStatus("Voice playback unavailable. You can read the response.");
      };

      await audio.play();
    } catch (error) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      console.error("Speech playback error:", error);
      setSpeaking(false);
      setStatus("Voice playback unavailable. You can read the response.");
    }
  };

  const stopSpeaking = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended?.call(audio, new Event("ended"));
    }
    setSpeaking(false);
    setStatus("Ready for your next message");
  };

  const sendText = async (text: string, fromRecording = false) => {
    const messageText = text.trim();

    if (!messageText || (loading && !fromRecording)) return;

    const history = messages.slice(1);

    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: messageText }
    ];

    setMessages(updatedMessages);
    setInput("");
    setLoading(true);
    setStatus("Your assistant is thinking...");

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        message: messageText,
        history
      });

      const reply = response.data.reply;

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: reply }
      ]);

      setStatus("Preparing voice response...");
      await speakResponse(reply);
      setStatus("Ready for your next message");
    } catch (error) {
      console.error("Chat error:", error);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again."
        }
      ]);

      setStatus("Unable to process your request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      setStatus("Requesting microphone permission...");

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access requires localhost or HTTPS.");
      }

      if (!window.MediaRecorder) {
        throw new Error("Your browser does not support audio recording.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;

      const types = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ];

      const mimeType = types.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      const chunks: BlobPart[] = [];

      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        setStatus("Recording failed. Please try again.");
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);

        const audioBlob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm"
        });

        if (!audioBlob.size) {
          setStatus("No audio was recorded. Please try again.");
          return;
        }

        setStatus("Converting your speech to text...");
        setLoading(true);

        const extension = audioBlob.type.includes("mp4") ? "mp4" : "webm";
        const formData = new FormData();

        formData.append("file", audioBlob, `recording.${extension}`);

        try {
          const response = await axios.post(
            `${API_URL}/voice/transcribe`,
            formData,
            { timeout: 90000 }
          );

          const transcript = response.data.text?.trim();

          if (!transcript) {
            throw new Error("No speech was recognized.");
          }

          setLoading(false);
          await sendText(transcript, true);
        } catch (error: any) {
          console.error("Transcription error:", error);

          setLoading(false);
          setStatus(
            error.response?.data?.detail ||
            "Voice input failed. Please try again."
          );
        }
      };

      recorder.start();
      setRecording(true);
      setStatus("Listening... Speak now, then press the microphone again to stop.");
    } catch (error: any) {
      console.error("Microphone error:", error);

      setStatus(
        error.message || "Microphone access failed. Check browser permissions."
      );

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
  };

  const handleMicrophone = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const showSuggestions = messages.length === 1 && !loading && !recording;

  const dotClass = recording
    ? "bg-red-500 animate-pulse"
    : loading
    ? "bg-amber-400 animate-pulse"
    : speaking
    ? "bg-blue-500 animate-pulse"
    : "bg-emerald-400";

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-600 px-5 py-4 text-white sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <Bot size={25} />
          </div>
          <div>
            <h3 className="font-semibold leading-tight">AI Appointment Assistant</h3>
            <p className="mt-0.5 text-xs text-blue-100">
              Find doctors, book or cancel by voice or text
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Online
        </div>
      </div>

      <div className="flex h-[540px] flex-col sm:h-[600px]">
        {/* Messages */}
        <div
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6"
          role="log"
          aria-live="polite"
          aria-label="Conversation"
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-end gap-2.5 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Bot size={17} />
                </div>
              )}

              <div
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${
                  message.role === "user"
                    ? "rounded-br-md bg-blue-600 text-white shadow-sm"
                    : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-sm"
                }`}
              >
                {message.content}
              </div>

              {message.role === "user" && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-600">
                  <User size={17} />
                </div>
              )}
            </div>
          ))}

          {showSuggestions && (
            <div className="pl-10">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                <Sparkles size={12} />
                Try asking
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => sendText(label)}
                    className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
                  >
                    <Icon size={14} className="text-blue-600" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-end gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <Bot size={17} />
              </div>
              <div className="flex items-center gap-3 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="flex gap-1" aria-hidden="true">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-blue-400" />
                </span>
                <span className="text-xs text-slate-500">{status}</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p
              className="flex min-w-0 items-center gap-2 text-xs text-slate-500"
              role="status"
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
              <span className="truncate">{status}</span>
            </p>

            {speaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
              >
                <Volume2 size={14} />
                Speaking
                <VolumeX size={14} className="ml-0.5 opacity-60" />
              </button>
            )}
          </div>

          {recording ? (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-2">
              <div className="flex flex-1 items-center gap-3 px-3">
                <span className="flex h-6 items-end gap-0.5" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className="w-1 animate-pulse rounded-full bg-red-500"
                      style={{
                        height: `${10 + ((i * 7) % 14)}px`,
                        animationDelay: `${i * 0.12}s`
                      }}
                    />
                  ))}
                </span>
                <span className="text-sm font-medium text-red-700">
                  Listening... tap stop when you're done
                </span>
              </div>
              <button
                type="button"
                onClick={handleMicrophone}
                title="Stop recording"
                aria-label="Stop recording"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white transition hover:bg-red-600"
              >
                <MicOff size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendText(input);
                }}
                placeholder="Ask me to find a doctor or book an appointment..."
                aria-label="Message"
                disabled={loading}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-60"
              />

              <button
                type="button"
                onClick={handleMicrophone}
                disabled={loading}
                title="Speak to assistant"
                aria-label="Speak to assistant"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                <Mic size={18} />
              </button>

              <button
                type="button"
                onClick={() => sendText(input)}
                disabled={loading || !input.trim()}
                title="Send message"
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}