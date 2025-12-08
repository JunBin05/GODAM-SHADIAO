"""
Script to pre-download the SpeechBrain ECAPA-TDNN model.
Run this once before starting the server.
"""

import os
# Fix Windows symlink permission issue
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["HF_HUB_DISABLE_SYMLINKS"] = "1"

import torch
from speechbrain.inference.speaker import SpeakerRecognition
from speechbrain.utils.fetching import LocalStrategy

print("Downloading SpeechBrain ECAPA-TDNN model...")
print("This may take a few minutes on first run.")
print()

try:
    model = SpeakerRecognition.from_hparams(
        source="speechbrain/spkrec-ecapa-voxceleb",
        savedir="pretrained_models/spkrec-ecapa-voxceleb",
        run_opts={"device": "cuda" if torch.cuda.is_available() else "cpu"},
        local_strategy=LocalStrategy.COPY
    )
    print()
    print("✓ Model downloaded and loaded successfully!")
    print("You can now run: python main.py")
except Exception as e:
    print(f"Error: {e}")
