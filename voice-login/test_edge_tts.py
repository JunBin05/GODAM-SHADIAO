"""Quick test for Edge TTS"""
import edge_tts
import asyncio
import pygame

async def test_tts():
    print("Testing Edge TTS...")
    # Test with English voice first
    communicate = edge_tts.Communicate("Hello, this is a test of Edge TTS. It sounds great!", "en-US-JennyNeural")
    await communicate.save("test_tts.mp3")
    print("✅ TTS file created!")
    
    # Play with pygame
    pygame.mixer.init()
    pygame.mixer.music.load("test_tts.mp3")
    pygame.mixer.music.play()
    
    while pygame.mixer.music.get_busy():
        await asyncio.sleep(0.1)
    
    print("✅ Playback complete!")

if __name__ == "__main__":
    asyncio.run(test_tts())
