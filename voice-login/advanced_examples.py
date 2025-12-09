"""
Advanced Usage Examples for Voice-Based Login API
Demonstrates more complex scenarios and integration patterns
"""

import numpy as np
import requests
from typing import Dict, List, Tuple
import json


# ============================================================================
# Example 1: Batch Registration
# ============================================================================

def batch_register_users(users: List[Dict[str, str]]) -> Dict:
    """
    Register multiple users at once.
    
    Args:
        users: List of dicts with 'user_id' and 'audio_path'
        
    Returns:
        Results dict with success/failure counts
    """
    results = {"success": [], "failed": []}
    
    for user in users:
        try:
            with open(user["audio_path"], "rb") as f:
                response = requests.post(
                    "http://localhost:8000/voice/register",
                    files={"audio": f},
                    data={"user_id": user["user_id"]},
                    timeout=60
                )
                
                if response.status_code == 200:
                    results["success"].append(user["user_id"])
                else:
                    results["failed"].append({
                        "user_id": user["user_id"],
                        "error": response.json().get("detail", "Unknown error")
                    })
        except Exception as e:
            results["failed"].append({
                "user_id": user["user_id"],
                "error": str(e)
            })
    
    return results


# Example usage:
"""
users_to_register = [
    {"user_id": "alice", "audio_path": "alice_voice.wav"},
    {"user_id": "bob", "audio_path": "bob_voice.wav"},
    {"user_id": "charlie", "audio_path": "charlie_voice.wav"},
]

results = batch_register_users(users_to_register)
print(f"Registered: {len(results['success'])}")
print(f"Failed: {len(results['failed'])}")
"""


# ============================================================================
# Example 2: Multi-attempt Login with Retry Logic
# ============================================================================

def login_with_retries(
    user_id: str,
    audio_path: str,
    max_attempts: int = 3,
    delay: float = 1.0
) -> Tuple[bool, float, int]:
    """
    Attempt login multiple times with exponential backoff.
    
    Args:
        user_id: User to authenticate
        audio_path: Path to login audio
        max_attempts: Maximum number of attempts
        delay: Initial delay between attempts
        
    Returns:
        Tuple of (authenticated, similarity_score, attempts_used)
    """
    import time
    
    for attempt in range(max_attempts):
        try:
            with open(audio_path, "rb") as f:
                response = requests.post(
                    "http://localhost:8000/voice/login",
                    files={"audio": f},
                    data={"user_id": user_id},
                    timeout=60
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return (
                        data["authenticated"],
                        data["similarity_score"],
                        attempt + 1
                    )
                
                if attempt < max_attempts - 1:
                    time.sleep(delay * (2 ** attempt))  # Exponential backoff
        
        except Exception as e:
            print(f"Attempt {attempt + 1} failed: {e}")
            if attempt < max_attempts - 1:
                time.sleep(delay * (2 ** attempt))
    
    return False, 0.0, max_attempts


# Example usage:
"""
authenticated, score, attempts = login_with_retries("alice", "alice_login.wav")
print(f"Authenticated: {authenticated}")
print(f"Similarity: {score}")
print(f"Attempts: {attempts}")
"""


# ============================================================================
# Example 3: A/B Testing - Compare Thresholds
# ============================================================================

def compare_authentication_strategies(
    user_id: str,
    audio_path: str,
    thresholds: List[float]
) -> Dict:
    """
    Compare authentication results across different thresholds.
    
    Args:
        user_id: User to authenticate
        audio_path: Path to login audio
        thresholds: List of thresholds to test
        
    Returns:
        Dict with results for each threshold
    """
    # First, do one login to get similarity score
    try:
        with open(audio_path, "rb") as f:
            response = requests.post(
                "http://localhost:8000/voice/login",
                files={"audio": f},
                data={"user_id": user_id},
                timeout=60
            )
            
            if response.status_code == 200:
                data = response.json()
                similarity = data["similarity_score"]
                
                results = {
                    "similarity_score": similarity,
                    "threshold_results": {}
                }
                
                for threshold in thresholds:
                    results["threshold_results"][threshold] = {
                        "authenticated": similarity > threshold,
                        "margin": round(similarity - threshold, 4)
                    }
                
                return results
    
    except Exception as e:
        return {"error": str(e)}


# Example usage:
"""
results = compare_authentication_strategies(
    "alice",
    "alice_login.wav",
    thresholds=[0.70, 0.75, 0.80, 0.85]
)

for threshold, result in results["threshold_results"].items():
    print(f"Threshold {threshold}: {result['authenticated']} "
          f"(margin: {result['margin']})")
"""


# ============================================================================
# Example 4: Performance Monitoring
# ============================================================================

class PerformanceMonitor:
    """Monitor API performance metrics."""
    
    def __init__(self):
        self.metrics = {
            "total_requests": 0,
            "successful_registrations": 0,
            "failed_registrations": 0,
            "successful_logins": 0,
            "failed_logins": 0,
            "response_times": [],
            "similarity_scores": []
        }
    
    def record_registration(self, success: bool, response_time: float):
        """Record registration attempt."""
        self.metrics["total_requests"] += 1
        if success:
            self.metrics["successful_registrations"] += 1
        else:
            self.metrics["failed_registrations"] += 1
        self.metrics["response_times"].append(response_time)
    
    def record_login(self, authenticated: bool, similarity: float, response_time: float):
        """Record login attempt."""
        self.metrics["total_requests"] += 1
        if authenticated:
            self.metrics["successful_logins"] += 1
        else:
            self.metrics["failed_logins"] += 1
        self.metrics["response_times"].append(response_time)
        self.metrics["similarity_scores"].append(similarity)
    
    def get_summary(self) -> Dict:
        """Get performance summary."""
        response_times = self.metrics["response_times"]
        similarity_scores = self.metrics["similarity_scores"]
        
        summary = {
            "total_requests": self.metrics["total_requests"],
            "successful_registrations": self.metrics["successful_registrations"],
            "failed_registrations": self.metrics["failed_registrations"],
            "successful_logins": self.metrics["successful_logins"],
            "failed_logins": self.metrics["failed_logins"],
            "registration_success_rate": (
                self.metrics["successful_registrations"] /
                (self.metrics["successful_registrations"] + self.metrics["failed_registrations"])
                if (self.metrics["successful_registrations"] + self.metrics["failed_registrations"]) > 0
                else 0
            ),
            "login_success_rate": (
                self.metrics["successful_logins"] /
                (self.metrics["successful_logins"] + self.metrics["failed_logins"])
                if (self.metrics["successful_logins"] + self.metrics["failed_logins"]) > 0
                else 0
            ),
            "avg_response_time": np.mean(response_times) if response_times else 0,
            "avg_similarity_score": np.mean(similarity_scores) if similarity_scores else 0,
            "max_similarity_score": max(similarity_scores) if similarity_scores else 0,
            "min_similarity_score": min(similarity_scores) if similarity_scores else 0
        }
        
        return summary


# Example usage:
"""
monitor = PerformanceMonitor()

# Simulate some requests
monitor.record_registration(True, 1.2)
monitor.record_registration(True, 1.1)
monitor.record_login(True, 0.82, 0.8)
monitor.record_login(False, 0.65, 0.8)

summary = monitor.get_summary()
print(json.dumps(summary, indent=2))
"""


# ============================================================================
# Example 5: User Authentication Session
# ============================================================================

class VoiceAuthSession:
    """Manage a voice authentication session."""
    
    def __init__(self, user_id: str, api_base_url: str = "http://localhost:8000"):
        self.user_id = user_id
        self.api_base_url = api_base_url
        self.session_token = None
        self.authenticated = False
        self.last_similarity = None
    
    def register(self, audio_path: str) -> bool:
        """Register user voice."""
        try:
            with open(audio_path, "rb") as f:
                response = requests.post(
                    f"{self.api_base_url}/voice/register",
                    files={"audio": f},
                    data={"user_id": self.user_id},
                    timeout=60
                )
                
                if response.status_code == 200:
                    return True
                return False
        except Exception as e:
            print(f"Registration error: {e}")
            return False
    
    def authenticate(self, audio_path: str) -> bool:
        """Authenticate user voice."""
        try:
            with open(audio_path, "rb") as f:
                response = requests.post(
                    f"{self.api_base_url}/voice/login",
                    files={"audio": f},
                    data={"user_id": self.user_id},
                    timeout=60
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.authenticated = data["authenticated"]
                    self.last_similarity = data["similarity_score"]
                    
                    if self.authenticated:
                        import uuid
                        self.session_token = str(uuid.uuid4())
                    
                    return self.authenticated
                
                return False
        except Exception as e:
            print(f"Authentication error: {e}")
            return False
    
    def is_authenticated(self) -> bool:
        """Check if session is authenticated."""
        return self.authenticated
    
    def get_session_token(self) -> str:
        """Get session token if authenticated."""
        return self.session_token if self.authenticated else None
    
    def get_summary(self) -> Dict:
        """Get session summary."""
        return {
            "user_id": self.user_id,
            "authenticated": self.authenticated,
            "similarity_score": self.last_similarity,
            "session_token": self.session_token
        }


# Example usage:
"""
session = VoiceAuthSession("alice")
session.register("alice_registration.wav")
session.authenticate("alice_login.wav")

if session.is_authenticated():
    token = session.get_session_token()
    print(f"Authentication successful. Session token: {token}")
else:
    print("Authentication failed")
"""


# ============================================================================
# Example 6: Similarity Score Analytics
# ============================================================================

def analyze_similarity_distribution(
    user_id: str,
    audio_samples: List[str],
    num_comparisons: int = 10
) -> Dict:
    """
    Analyze similarity score distribution for a user.
    
    Args:
        user_id: User ID
        audio_samples: List of audio file paths
        num_comparisons: Number of pairwise comparisons
        
    Returns:
        Statistics about similarity distribution
    """
    import random
    
    similarities = []
    
    # Perform multiple logins with different audio samples
    for audio_file in audio_samples[:num_comparisons]:
        try:
            with open(audio_file, "rb") as f:
                response = requests.post(
                    "http://localhost:8000/voice/login",
                    files={"audio": f},
                    data={"user_id": user_id},
                    timeout=60
                )
                
                if response.status_code == 200:
                    similarities.append(response.json()["similarity_score"])
        except Exception as e:
            print(f"Error processing {audio_file}: {e}")
    
    if not similarities:
        return {"error": "No valid samples"}
    
    similarities_arr = np.array(similarities)
    
    return {
        "num_samples": len(similarities),
        "mean": float(np.mean(similarities_arr)),
        "median": float(np.median(similarities_arr)),
        "std_dev": float(np.std(similarities_arr)),
        "min": float(np.min(similarities_arr)),
        "max": float(np.max(similarities_arr)),
        "q25": float(np.percentile(similarities_arr, 25)),
        "q75": float(np.percentile(similarities_arr, 75)),
        "all_scores": [float(s) for s in similarities]
    }


# Example usage:
"""
audio_samples = [
    "alice_sample_1.wav",
    "alice_sample_2.wav",
    "alice_sample_3.wav",
]

stats = analyze_similarity_distribution("alice", audio_samples)
print(f"Mean similarity: {stats['mean']}")
print(f"Std dev: {stats['std_dev']}")
print(f"Range: {stats['min']} - {stats['max']}")
"""


if __name__ == "__main__":
    print("Advanced Voice Authentication Examples")
    print("=" * 60)
    print("\nAvailable Examples:")
    print("1. batch_register_users() - Register multiple users")
    print("2. login_with_retries() - Login with retry logic")
    print("3. compare_authentication_strategies() - A/B test thresholds")
    print("4. PerformanceMonitor() - Track API metrics")
    print("5. VoiceAuthSession() - Manage auth sessions")
    print("6. analyze_similarity_distribution() - Analyze similarity scores")
    print("\nSee docstrings and comments for usage examples.")
