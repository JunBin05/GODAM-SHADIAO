"""
Microphone Debug Script
Run this to diagnose audio recording issues
"""
import sounddevice as sd
import numpy as np

print("=" * 50)
print("MICROPHONE DEBUG TOOL")
print("=" * 50)
print()

# Show default devices
print(f"Default Input Device ID: {sd.default.device[0]}")
print(f"Default Output Device ID: {sd.default.device[1]}")
print()

# List all devices with input capability
print("Available INPUT devices:")
print("-" * 40)
devices = sd.query_devices()
for i, d in enumerate(devices):
    if d['max_input_channels'] > 0:
        is_default = " [DEFAULT]" if i == sd.default.device[0] else ""
        print(f"  [{i}] {d['name']}{is_default}")
        print(f"       Channels: {d['max_input_channels']}, Sample Rate: {d['default_samplerate']}")

print()
print("-" * 40)

# Ask user which device to test
print()
device_id = input("Enter device ID to test (or press ENTER for default): ").strip()

if device_id:
    device_id = int(device_id)
    sd.default.device[0] = device_id
    print(f"Using device [{device_id}]")
else:
    device_id = sd.default.device[0]
    print(f"Using default device [{device_id}]")

print()
print("=" * 50)
print("RECORDING TEST - Speak now for 3 seconds!")
print("=" * 50)

# Record with explicit settings
try:
    audio = sd.rec(
        frames=int(3 * 16000),
        samplerate=16000,
        channels=1,
        dtype=np.float32,
        device=device_id
    )
    sd.wait()
    
    print()
    print("Recording complete!")
    print()
    print(f"Audio shape: {audio.shape}")
    print(f"Audio dtype: {audio.dtype}")
    print(f"Max value: {np.max(audio):.6f}")
    print(f"Min value: {np.min(audio):.6f}")
    print(f"Max absolute: {np.max(np.abs(audio)):.6f}")
    print(f"Mean absolute: {np.mean(np.abs(audio)):.6f}")
    print(f"Std deviation: {np.std(audio):.6f}")
    print()
    
    max_vol = np.max(np.abs(audio))
    
    if max_vol < 0.001:
        print("❌ PROBLEM: Audio is essentially SILENT!")
        print()
        print("Possible fixes:")
        print("  1. Check Windows Sound Settings:")
        print("     - Right-click speaker icon -> Sound Settings")
        print("     - Input section -> Make sure correct mic is selected")
        print("     - Click on device -> Check volume is not 0")
        print()
        print("  2. Check Microphone Privacy:")
        print("     - Settings -> Privacy -> Microphone")
        print("     - Make sure 'Allow apps to access microphone' is ON")
        print()
        print("  3. Try a different device ID from the list above")
        
    elif max_vol < 0.05:
        print("⚠️ WARNING: Audio is very quiet")
        print("   Try speaking louder or increase mic volume in Windows")
    else:
        print("✅ SUCCESS: Microphone is working!")
        print(f"   Volume level looks good: {max_vol:.4f}")

except Exception as e:
    print(f"❌ ERROR: {e}")
    import traceback
    traceback.print_exc()

print()
input("Press ENTER to exit...")
