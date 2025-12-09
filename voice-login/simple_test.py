"""
Simple Voice Registration & Verification Test
Easy-to-use script for testing voice authentication
"""

import requests
import numpy as np
import time

# Try to import audio libraries
try:
    import sounddevice as sd
    import scipy.io.wavfile as wav
    AUDIO_AVAILABLE = True
except ImportError:
    AUDIO_AVAILABLE = False
    print("⚠️  Audio libraries not found. Run: pip install sounddevice scipy")

# Configuration
API_BASE_URL = "http://localhost:8000"
SAMPLE_RATE = 16000  # 16kHz
RECORD_DURATION = 5  # 5 seconds

# The phrase to say (helps with voice verification)
REGISTRATION_PHRASE = "My voice is my password, verify me now"


def check_server():
    """Check if the API server is running."""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Server is running!")
            print(f"   Model loaded: {data['model_loaded']}")
            return data['model_loaded']
        return False
    except:
        print("❌ Server is not running!")
        print("   Please start the server first: python main.py")
        return False


def record_voice(filename: str, duration: int = RECORD_DURATION) -> str:
    """Record voice from microphone."""
    if not AUDIO_AVAILABLE:
        print("❌ Audio recording not available")
        return None
    
    print(f"\n🎤 Ready to record for {duration} seconds")
    print(f"   Please say: \"{REGISTRATION_PHRASE}\"")
    input("\n   Press ENTER when you're ready to speak...")
    print("   🔴 RECORDING NOW - SPEAK!")
    
    try:
        # Record audio
        audio_data = sd.rec(
            int(duration * SAMPLE_RATE), 
            samplerate=SAMPLE_RATE, 
            channels=1, 
            dtype=np.int16
        )
        sd.wait()  # Wait until recording is done
        
        # Save to WAV file
        wav.write(filename, SAMPLE_RATE, audio_data)
        print(f"   ✅ Recording saved to {filename}")
        return filename
    
    except Exception as e:
        print(f"❌ Recording error: {e}")
        return None


def register_voice(username: str) -> bool:
    """Register a user's voice."""
    print("\n" + "="*60)
    print(f"📝 VOICE REGISTRATION for: {username}")
    print("="*60)
    
    # Record voice
    audio_file = record_voice(f"{username}_registration.wav")
    if not audio_file:
        return False
    
    # Send to server
    print("\n⏳ Processing registration...")
    try:
        with open(audio_file, "rb") as f:
            response = requests.post(
                f"{API_BASE_URL}/voice/register",
                files={"audio": (audio_file, f, "audio/wav")},
                data={"user_id": username},
                timeout=120
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"\n✅ REGISTRATION SUCCESSFUL!")
            print(f"   User: {result['user_id']}")
            print(f"   Voice embedding stored (dimension: {result['embedding_dim']})")
            return True
        else:
            error = response.json().get('detail', 'Unknown error')
            print(f"\n❌ Registration failed: {error}")
            return False
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def verify_voice(username: str) -> bool:
    """Verify a user's voice (login attempt)."""
    print("\n" + "="*60)
    print(f"🔐 VOICE VERIFICATION for: {username}")
    print("="*60)
    
    # Record voice
    audio_file = record_voice(f"{username}_verification.wav")
    if not audio_file:
        return False
    
    # Send to server
    print("\n⏳ Verifying voice...")
    try:
        with open(audio_file, "rb") as f:
            response = requests.post(
                f"{API_BASE_URL}/voice/login",
                files={"audio": (audio_file, f, "audio/wav")},
                data={"user_id": username},
                timeout=120
            )
        
        if response.status_code == 200:
            result = response.json()
            similarity = result['similarity_score']
            threshold = result['threshold']
            authenticated = result['authenticated']
            
            print(f"\n{'='*60}")
            print(f"📊 VERIFICATION RESULT")
            print(f"{'='*60}")
            print(f"   User: {username}")
            print(f"   Similarity Score: {similarity:.2%}")
            print(f"   Threshold: {threshold:.2%}")
            print(f"   Match: {'above' if similarity > threshold else 'below'} threshold")
            print(f"{'='*60}")
            
            if authenticated:
                print(f"   ✅ AUTHENTICATED - It's you!")
            else:
                print(f"   ❌ NOT AUTHENTICATED - Voice doesn't match")
            
            print(f"{'='*60}")
            return authenticated
        
        elif response.status_code == 404:
            print(f"\n❌ User '{username}' not found. Please register first.")
            return False
        else:
            error = response.json().get('detail', 'Unknown error')
            print(f"\n❌ Verification failed: {error}")
            return False
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def main():
    """Main interactive menu."""
    print("\n" + "="*60)
    print("🎤 VOICE AUTHENTICATION TEST")
    print("="*60)
    print(f"\nPhrase to say: \"{REGISTRATION_PHRASE}\"")
    print("(Saying the same phrase helps with accuracy)")
    print("="*60)
    
    # Check server
    if not check_server():
        return
    
    while True:
        print("\n" + "-"*40)
        print("Choose an option:")
        print("  1. Register my voice")
        print("  2. Verify my voice (login)")
        print("  3. Exit")
        print("-"*40)
        
        choice = input("Enter choice (1/2/3): ").strip()
        
        if choice == "1":
            username = input("Enter your username: ").strip()
            if username:
                register_voice(username)
            else:
                print("❌ Username cannot be empty")
        
        elif choice == "2":
            username = input("Enter your username: ").strip()
            if username:
                verify_voice(username)
            else:
                print("❌ Username cannot be empty")
        
        elif choice == "3":
            print("\n👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1, 2, or 3.")


if __name__ == "__main__":
    main()
