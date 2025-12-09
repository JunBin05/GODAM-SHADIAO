import requests

url = "http://localhost:8000/api/financial-aid/Detected%20IC"
print(f"Testing: {url}")

try:
    response = requests.get(url, timeout=5)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
