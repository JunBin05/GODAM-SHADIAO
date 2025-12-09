import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, useLoadScript } from '@react-google-maps/api';
import { Store, Navigation } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '10px'
};

const defaultCenter = {
  lat: 3.139,
  lng: 101.6869
};

const StoreMap = ({ stores, userLocation, onStoreClick }) => {
  const [selectedStore, setSelectedStore] = useState(null);
  const [map, setMap] = useState(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: 'AIzaSyDZQwC7JyMymdJFThu-lNBu45NjOBBqbIc',
    libraries: ['places'],
    loadingStrategy: 'async',
  });

  useEffect(() => {
    if (map && stores.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // Add user location
      if (userLocation) {
        bounds.extend(new window.google.maps.LatLng(userLocation.lat, userLocation.lng));
      }
      
      // Add all store locations
      stores.forEach(store => {
        bounds.extend(new window.google.maps.LatLng(store.latitude, store.longitude));
      });
      
      map.fitBounds(bounds);
    }
  }, [map, stores, userLocation]);

  if (loadError) {
    return <div style={{ color: '#ef4444', padding: '20px', textAlign: 'center' }}>
      Error loading maps. Please check your internet connection.
    </div>;
  }

  if (!isLoaded) {
    return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      Loading map...
    </div>;
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={13}
      center={userLocation || defaultCenter}
      onLoad={setMap}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {/* User location marker */}
      {userLocation && (
        <Marker
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          }}
          title="Your Location"
        />
      )}

      {/* Store markers */}
      {stores.map((store, index) => (
        <Marker
          key={store.id || index}
          position={{ lat: store.latitude, lng: store.longitude }}
          onClick={() => setSelectedStore(store)}
          icon={{
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          }}
        />
      ))}

      {/* Info window for selected store */}
      {selectedStore && (
        <InfoWindow
          position={{ lat: selectedStore.latitude, lng: selectedStore.longitude }}
          onCloseClick={() => setSelectedStore(null)}
        >
          <div style={{ padding: '10px', maxWidth: '250px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Store size={20} color="#2563eb" />
              <strong style={{ fontSize: '1.1rem', color: '#1f2937' }}>{selectedStore.name}</strong>
            </div>
            <p style={{ margin: '5px 0', color: '#6b7280', fontSize: '0.9rem' }}>
              {selectedStore.address}
            </p>
            <div style={{ margin: '8px 0', fontSize: '0.85rem', color: '#4b5563' }}>
              <strong>{(selectedStore.distance_km || selectedStore.distance || 0).toFixed(2)} km</strong> away
            </div>
            {onStoreClick && (
              <button
                onClick={() => onStoreClick(selectedStore)}
                style={{
                  marginTop: '10px',
                  padding: '6px 12px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.9rem'
                }}
              >
                <Navigation size={16} />
                Navigate
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default StoreMap;
