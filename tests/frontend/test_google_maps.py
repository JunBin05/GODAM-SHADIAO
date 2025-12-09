"""
Test Google Maps API Key
"""

import requests
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from config import GOOGLE_MAPS_API_KEY

print("\n" + "="*70)
print("GOOGLE MAPS API KEY TEST")
print("="*70)

if not GOOGLE_MAPS_API_KEY:
    print("\n❌ ERROR: GOOGLE_MAPS_API_KEY is empty!")
    print("Please add your API key to backend/config.py")
    exit(1)

print(f"\n✅ API Key found: {GOOGLE_MAPS_API_KEY[:20]}...{GOOGLE_MAPS_API_KEY[-5:]}")

# Test 1: Geocoding API (convert address to coordinates)
print("\n" + "="*70)
print("TEST 1: GEOCODING API (Address → Coordinates)")
print("="*70)

test_address = "Kuala Lumpur City Centre, Malaysia"
geocode_url = f"https://maps.googleapis.com/maps/api/geocode/json?address={test_address}&key={GOOGLE_MAPS_API_KEY}"

print(f"\nTesting address: {test_address}")

try:
    response = requests.get(geocode_url)
    data = response.json()
    
    if data['status'] == 'OK':
        location = data['results'][0]['geometry']['location']
        formatted_address = data['results'][0]['formatted_address']
        print(f"✅ SUCCESS!")
        print(f"   Address: {formatted_address}")
        print(f"   Latitude: {location['lat']}")
        print(f"   Longitude: {location['lng']}")
    elif data['status'] == 'REQUEST_DENIED':
        print(f"❌ FAILED: {data.get('error_message', 'Request denied')}")
        print("\n🔧 Fix: Enable 'Geocoding API' in Google Cloud Console")
        print("   https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com")
    else:
        print(f"❌ FAILED: {data['status']}")
        print(f"   Message: {data.get('error_message', 'Unknown error')}")
except Exception as e:
    print(f"❌ ERROR: {e}")

# Test 2: Places API (find nearby stores)
print("\n" + "="*70)
print("TEST 2: PLACES NEARBY SEARCH")
print("="*70)

# Kuala Lumpur coordinates
lat, lng = 3.139, 101.6869
places_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{lng}&radius=1000&type=store&key={GOOGLE_MAPS_API_KEY}"

print(f"\nSearching for stores near: {lat}, {lng} (Kuala Lumpur)")

try:
    response = requests.get(places_url)
    data = response.json()
    
    if data['status'] == 'OK':
        results = data.get('results', [])
        print(f"✅ SUCCESS! Found {len(results)} places")
        print("\nFirst 3 places:")
        for i, place in enumerate(results[:3], 1):
            print(f"   {i}. {place['name']}")
            print(f"      {place.get('vicinity', 'No address')}")
    elif data['status'] == 'REQUEST_DENIED':
        print(f"❌ FAILED: {data.get('error_message', 'Request denied')}")
        print("\n🔧 Fix: Enable 'Places API' in Google Cloud Console")
        print("   https://console.cloud.google.com/apis/library/places-backend.googleapis.com")
    else:
        print(f"⚠️  Status: {data['status']}")
        print(f"   Message: {data.get('error_message', 'No results or error')}")
except Exception as e:
    print(f"❌ ERROR: {e}")

# Test 3: Distance Matrix API (calculate distances)
print("\n" + "="*70)
print("TEST 3: DISTANCE MATRIX API")
print("="*70)

origin = "3.139,101.6869"  # Kuala Lumpur
destination = "3.073,101.518"  # Shah Alam
distance_url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin}&destinations={destination}&key={GOOGLE_MAPS_API_KEY}"

print(f"\nCalculating distance from Kuala Lumpur to Shah Alam")

try:
    response = requests.get(distance_url)
    data = response.json()
    
    if data['status'] == 'OK':
        element = data['rows'][0]['elements'][0]
        if element['status'] == 'OK':
            distance = element['distance']['text']
            duration = element['duration']['text']
            print(f"✅ SUCCESS!")
            print(f"   Distance: {distance}")
            print(f"   Duration: {duration}")
        else:
            print(f"❌ FAILED: {element['status']}")
    elif data['status'] == 'REQUEST_DENIED':
        print(f"❌ FAILED: {data.get('error_message', 'Request denied')}")
        print("\n🔧 Fix: Enable 'Distance Matrix API' in Google Cloud Console")
        print("   https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com")
    else:
        print(f"❌ FAILED: {data['status']}")
except Exception as e:
    print(f"❌ ERROR: {e}")

# Summary
print("\n" + "="*70)
print("SUMMARY")
print("="*70)
print("""
✅ APIs to Enable in Google Cloud Console:
   1. Geocoding API - Convert addresses to coordinates
   2. Places API - Search for nearby places
   3. Distance Matrix API - Calculate distances
   4. Maps JavaScript API - Display interactive maps (frontend)

🔗 Quick Link: https://console.cloud.google.com/apis/library

💡 Note: Each API needs to be enabled separately in your Google Cloud project
""")
print("="*70 + "\n")
