from fastapi import APIRouter, HTTPException, status, Query
from models.store import Store, StoreLocatorRequest, StoreLocatorResponse
from services.store_service import find_nearby_stores, get_store_by_id

router = APIRouter()


@router.post("/locate", response_model=StoreLocatorResponse)
async def locate_nearby_stores(request: StoreLocatorRequest):
    """
    Find nearby stores that accept aid program payments.
    
    - **latitude**: User's current GPS latitude
    - **longitude**: User's current GPS longitude
    - **radius_km**: Search radius in kilometers (default: 5.0, max: 50.0)
    - **program_id**: Filter by accepted program (str, sara, mykasih) - optional
    - **store_type**: Filter by type (grocery, supermarket, hypermarket, pharmacy) - optional
    
    Returns list of stores sorted by distance (nearest first) with GPS coordinates.
    """
    # Validate GPS coordinates
    if not (-90 <= request.latitude <= 90):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "Invalid latitude. Must be between -90 and 90.",
                "code": "INVALID_LATITUDE"
            }
        )
    
    if not (-180 <= request.longitude <= 180):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "success": False,
                "error": "Invalid longitude. Must be between -180 and 180.",
                "code": "INVALID_LONGITUDE"
            }
        )
    
    # Find nearby stores
    nearby_stores = find_nearby_stores(
        user_lat=request.latitude,
        user_lon=request.longitude,
        radius_km=request.radius_km,
        program_id=request.program_id,
        store_type=request.store_type
    )
    
    # Build response message
    if len(nearby_stores) == 0:
        message = f"No stores found within {request.radius_km} km radius"
        if request.program_id:
            message += f" that accept {request.program_id.upper()}"
        if request.store_type:
            message += f" of type {request.store_type}"
    else:
        message = f"Found {len(nearby_stores)} store(s) within {request.radius_km} km radius"
    
    return StoreLocatorResponse(
        success=True,
        data=[Store(**store) for store in nearby_stores],
        message=message
    )


@router.get("/{store_id}", response_model=dict)
async def get_store_details(store_id: str):
    """
    Get detailed information about a specific store.
    
    - **store_id**: Unique store identifier (e.g., STORE001)
    
    Returns store details including address, GPS coordinates, and accepted programs.
    """
    store = get_store_by_id(store_id)
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "success": False,
                "error": f"Store with ID '{store_id}' not found",
                "code": "STORE_NOT_FOUND"
            }
        )
    
    return {
        "success": True,
        "data": Store(**store),
        "message": "Store details retrieved successfully"
    }
