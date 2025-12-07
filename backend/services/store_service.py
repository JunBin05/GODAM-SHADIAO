import json
import os
from typing import List, Dict, Optional
from utils.haversine import haversine_distance

def load_stores() -> List[Dict]:
    """Load stores from mock data file"""
    try:
        # Get the directory where this file is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Navigate to the data directory
        data_path = os.path.join(current_dir, '..', 'data', 'mock_stores.json')
        
        with open(data_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data.get('stores', [])
    except FileNotFoundError as e:
        print(f"Store data file not found: {e}")
        return []
    except json.JSONDecodeError as e:
        print(f"Error decoding store data: {e}")
        return []


def find_nearby_stores(
    user_lat: float,
    user_lon: float,
    radius_km: float = 5.0,
    program_id: Optional[str] = None,
    store_type: Optional[str] = None
) -> List[Dict]:
    """
    Find stores within specified radius from user location.
    
    Args:
        user_lat: User's latitude
        user_lon: User's longitude
        radius_km: Search radius in kilometers (default: 5.0)
        program_id: Filter by accepted program ID (optional)
        store_type: Filter by store type (optional)
    
    Returns:
        List of stores sorted by distance (nearest first)
    """
    all_stores = load_stores()
    nearby_stores = []
    
    for store in all_stores:
        # Calculate distance using Haversine formula
        distance = haversine_distance(
            user_lat, user_lon,
            store['latitude'], store['longitude']
        )
        
        # Check if within radius
        if distance <= radius_km:
            # Normalize store data (handle both 'type' and 'store_type' fields)
            store_type_value = store.get('type') or store.get('store_type', '')
            
            # All stores accept all programs by default if not specified
            accepted_programs = store.get('accepted_programs', ['str', 'sara', 'mykasih'])
            
            # Apply program filter if specified
            if program_id and program_id not in accepted_programs:
                continue
            
            # Apply store type filter if specified
            if store_type and store_type_value.lower() != store_type.lower():
                continue
            
            # Add distance and normalize fields
            store_with_distance = store.copy()
            store_with_distance['distance'] = distance
            store_with_distance['type'] = store_type_value
            store_with_distance['accepted_programs'] = accepted_programs
            # Normalize address and state fields if missing
            if 'state' not in store_with_distance:
                store_with_distance['state'] = 'Selangor'  # Default for mock data
            nearby_stores.append(store_with_distance)
    
    # Sort by distance (nearest first)
    nearby_stores.sort(key=lambda x: x['distance'])
    
    return nearby_stores


def get_store_by_id(store_id: str) -> Optional[Dict]:
    """
    Get store details by store ID.
    
    Args:
        store_id: Store identifier
    
    Returns:
        Store data dict or None if not found
    """
    all_stores = load_stores()
    
    for store in all_stores:
        if store['store_id'] == store_id:
            return store
    
    return None
