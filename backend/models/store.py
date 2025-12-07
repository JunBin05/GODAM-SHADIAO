from pydantic import BaseModel, Field
from typing import List, Optional

class Store(BaseModel):
    """Store information model"""
    store_id: str = Field(..., description="Unique store identifier")
    name: str = Field(..., description="Store name")
    address: str = Field(..., description="Store address")
    state: str = Field(..., description="State location")
    latitude: float = Field(..., description="GPS latitude coordinate")
    longitude: float = Field(..., description="GPS longitude coordinate")
    type: str = Field(..., description="Store type (grocery, supermarket, hypermarket, pharmacy)")
    accepted_programs: List[str] = Field(..., description="List of accepted aid program IDs")
    distance: Optional[float] = Field(None, description="Distance from user location in kilometers")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "store_id": "STORE001",
                "name": "Mydin Hypermarket",
                "address": "Jalan Raja Laut, Kuala Lumpur",
                "state": "Kuala Lumpur",
                "latitude": 3.1628,
                "longitude": 101.6969,
                "type": "hypermarket",
                "accepted_programs": ["str", "sara", "mykasih"],
                "distance": 2.5
            }
        }
    }


class StoreLocatorRequest(BaseModel):
    """Request model for store locator"""
    latitude: float = Field(..., description="User's current latitude")
    longitude: float = Field(..., description="User's current longitude")
    radius_km: Optional[float] = Field(5.0, description="Search radius in kilometers", ge=0.1, le=50.0)
    program_id: Optional[str] = Field(None, description="Filter by accepted program ID")
    store_type: Optional[str] = Field(None, description="Filter by store type")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "latitude": 3.1478,
                "longitude": 101.6953,
                "radius_km": 10.0,
                "program_id": "mykasih",
                "store_type": "supermarket"
            }
        }
    }


class StoreLocatorResponse(BaseModel):
    """Response model for store locator"""
    success: bool = Field(True, description="API call success status")
    data: List[Store] = Field(..., description="List of nearby stores sorted by distance")
    message: str = Field(..., description="Response message")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "data": [
                    {
                        "store_id": "STORE001",
                        "name": "Mydin Hypermarket",
                        "address": "Jalan Raja Laut, Kuala Lumpur",
                        "state": "Kuala Lumpur",
                        "latitude": 3.1628,
                        "longitude": 101.6969,
                        "type": "hypermarket",
                        "accepted_programs": ["str", "sara", "mykasih"],
                        "distance": 2.5
                    }
                ],
                "message": "Found 15 stores within 10.0 km radius"
            }
        }
    }
