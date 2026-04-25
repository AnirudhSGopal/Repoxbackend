import requests

try:
    print("Attempting to connect to http://localhost:8000/health")
    response = requests.get("http://localhost:8000/health", timeout=5)
    print(f"Status: {response.status_code}")
    print(f"Body: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
