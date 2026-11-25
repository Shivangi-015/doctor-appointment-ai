from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from fastapi.responses import Response
from app.services.voice_service import transcribe_audio, generate_speech

router = APIRouter(prefix="/api/voice", tags=["Voice"])


@router.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):
    try:
        audio_data = await file.read()

        if not audio_data:
            raise HTTPException(status_code=400, detail="Audio file is empty.")

        if len(audio_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file is too large.")

        transcript = transcribe_audio(
            audio_data,
            file.filename or "recording.webm",
            file.content_type or "audio/webm"
        )

        return {"text": transcript}

    except HTTPException:
        raise
    except Exception as error:
        print("Transcription error:", error)
        raise HTTPException(status_code=502, detail="Unable to transcribe audio.")


@router.post("/speak")
def speak(text: str = Form(...)):
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    if len(text) > 2000:
        raise HTTPException(status_code=400, detail="Text is too long.")

    try:
        audio = generate_speech(text.strip())

        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=response.mp3"}
        )

    except Exception as error:
        print("Speech generation error:", error)
        raise HTTPException(status_code=502, detail="Unable to generate speech.")