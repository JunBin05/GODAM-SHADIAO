"""
Test client for Voice-Based Login API
Demonstrates how to use the registration and login endpoints
"""

import requests
from pathlib import Path
import numpy as np
import sounddevice as sd
import scipy.io.wavfile as wav


# API Configuration
API_BASE_URL = "http://localhost:8000"
SAMPLE_RATE = 16000  # 16kHz as required by model


def record_audio(duration: int = 4, filename: str = "temp_recording.wav") -> str:
    """
    Record audio from microphone.
    
    Args:
        duration: Recording duration in seconds
        filename: Output filename
        
    Returns:
        Path to saved audio file
    """
    try:
        print(f"\n🎤 Recording for {duration} seconds... (speak now)")
        audio_data = sd.rec(int(duration * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype=np.int16)
        sd.wait()  # Wait until recording is done
        
        # Save to WAV file
        wav.write(filename, SAMPLE_RATE, audio_data)
        print(f"✓ Audio saved to {filename}")
        return filename
    
    except Exception as e:
        print(f"❌ Error recording audio: {e}")
        print("   Make sure you have 'sounddevice' installed: pip install sounddevice")
        return None


def load_audio_file(filepath: str) -> str:
    """Load audio file from disk."""
    if Path(filepath).exists():
        return filepath
    else:
        print(f"❌ File not found: {filepath}")
        return None


def test_health_check():
    """Test the health check endpoint."""
    print("\n" + "="*60)
    print("Testing Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Health check passed")
            print(f"  Status: {data['status']}")
            print(f"  Model loaded: {data['model_loaded']}")
            print(f"  Threshold: {data['similarity_threshold']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_registration(user_id: str, audio_file: str):
    """Test registration endpoint."""
    print("\n" + "="*60)
    print(f"Testing Registration for User: {user_id}")
    print("="*60)
    
    try:
        with open(audio_file, "rb") as f:
            files = {"audio": (audio_file, f, "audio/wav")}
            data = {"user_id": user_id}
            
            response = requests.post(
                f"{API_BASE_URL}/voice/register",
                files=files,
                data=data,
                timeout=60
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Registration successful")
            print(f"  User ID: {result['user_id']}")
            print(f"  Embedding dimension: {result['embedding_dim']}")
            return True
        else:
            print(f"❌ Registration failed: {response.status_code}")
            print(f"  Error: {response.json()}")
            return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_login(user_id: str, audio_file: str):
    """Test login endpoint."""
    print("\n" + "="*60)
    print(f"Testing Login for User: {user_id}")
    print("="*60)
    
    try:
        with open(audio_file, "rb") as f:
            files = {"audio": (audio_file, f, "audio/wav")}
            data = {"user_id": user_id}
            
            response = requests.post(
                f"{API_BASE_URL}/voice/login",
                files=files,
                data=data,
                timeout=60
            )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Login request processed")
            print(f"  User ID: {result['user_id']}")
            print(f"  Authenticated: {result['authenticated']}")
            print(f"  Similarity Score: {result['similarity_score']}")
            print(f"  Threshold: {result['threshold']}")
            print(f"  Message: {result['message']}")
            return result['authenticated']
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"  Error: {response.json()}")
            return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_get_user_info(user_id: str):
    """Get user information."""
    print("\n" + "="*60)
    print(f"Testing Get User Info: {user_id}")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/voice/user/{user_id}/info")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ User found")
            print(f"  User ID: {result['user_id']}")
            print(f"  Registered: {result['registered']}")
            print(f"  Embedding dimension: {result['embedding_dimension']}")
            print(f"  Embedding norm: {result['embedding_norm']}")
            return True
        else:
            print(f"❌ User not found: {response.status_code}")
            return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_delete_user(user_id: str):
    """Delete a user."""
    print("\n" + "="*60)
    print(f"Testing Delete User: {user_id}")
    print("="*60)
    
    try:
        response = requests.delete(f"{API_BASE_URL}/voice/user/{user_id}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ User deleted")
            print(f"  Message: {result['message']}")
            return True
        else:
            print(f"❌ Delete failed: {response.status_code}")
            return False
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def run_full_test_with_recording():
    """Run a complete test flow with live microphone recording."""
    user_id = "test_user_001"
    
    # Step 1: Health check
    if not test_health_check():
        print("\n❌ Server is not running. Start it with: python main.py")
        return
    
    # Step 2: Record registration audio
    print("\n" + "="*60)
    print("PHASE 1: REGISTRATION")
    print("="*60)
    reg_audio = record_audio(duration=4, filename="registration.wav")
    if reg_audio is None:
        return
    
    # Step 3: Register
    if not test_registration(user_id, reg_audio):
        return
    
    # Step 4: Get user info
    test_get_user_info(user_id)
    
    # Step 5: Record login audio (same user)
    print("\n" + "="*60)
    print("PHASE 2: LOGIN TEST (Same User)")
    print("="*60)
    login_audio = record_audio(duration=4, filename="login.wav")
    if login_audio is None:
        return
    
    # Step 6: Login
    authenticated = test_login(user_id, login_audio)
    
    # Step 7: Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"User ID: {user_id}")
    print(f"Registration: ✓ Success")
    print(f"Login: {'✓ Success' if authenticated else '✗ Failed'}")
    print("="*60 + "\n")
    
    # Cleanup
    Path("registration.wav").unlink(missing_ok=True)
    Path("login.wav").unlink(missing_ok=True)


def run_simple_test_with_files():
    """Run test with pre-recorded audio files."""
    print("\nℹ️  Using pre-recorded audio files for testing")
    print("   Place audio files in current directory")
    print("   (e.g., sample_registration.wav, sample_login.wav)")
    
    user_id = "test_user_002"
    
    # Test with provided files
    if Path("sample_registration.wav").exists():
        test_health_check()
        test_registration(user_id, "sample_registration.wav")
        test_get_user_info(user_id)
        
        if Path("sample_login.wav").exists():
            test_login(user_id, "sample_login.wav")
        else:
            print("\n❌ sample_login.wav not found")


if __name__ == "__main__":
    import sys
    
    print("\n🎤 Voice-Based Login API - Test Client")
    print("="*60)
    
    # Check if sounddevice is available
    try:
        import sounddevice
        print("✓ sounddevice available - can record live audio")
        
        if len(sys.argv) > 1 and sys.argv[1] == "--files":
            run_simple_test_with_files()
        else:
            run_full_test_with_recording()
    
    except ImportError:
        print("⚠ sounddevice not available")
        print("  Run: pip install sounddevice scipy")
        run_simple_test_with_files()
