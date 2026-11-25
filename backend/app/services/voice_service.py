import os
import requests

from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("ELEVENLABS_API_KEY")
VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
BASE_URL = "https://api.elevenlabs.io/v1"

if not API_KEY:
    raise ValueError("ELEVENLABS_API_KEY is missing from the .env file")


def transcribe_audio(audio_data: bytes, filename: str, content_type: str) -> str:
    response = requests.post(
        f"{BASE_URL}/speech-to-text",
        headers={"xi-api-key": API_KEY},
        data={"model_id": "scribe_v3"},
        files={
            "file": (
                filename,
                audio_data,
                content_type or "audio/webm"
            )
        },
        timeout=60
    )

    if not response.ok:
        raise RuntimeError(f"Speech transcription failed: {response.text}")

    result = response.json()
    transcript = result.get("text", "").strip()

    if not transcript:
        raise RuntimeError("No speech could be recognized.")

    return transcript


def generate_speech(text: str) -> bytes:
    response = requests.post(
        f"{BASE_URL}/text-to-speech/{VOICE_ID}",
        headers={
            "xi-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        params={"output_format": "mp3_44100_128"},
        json={
            "text": text,
            "model_id": "eleven_multilingual_v2"
        },
        timeout=60
    )

    if not response.ok:
        raise RuntimeError(f"Speech generation failed: {response.text}")

    return response.content