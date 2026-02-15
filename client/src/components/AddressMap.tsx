import React, { useState, useEffect, Component, ErrorInfo, ReactNode, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, AlertTriangle } from 'lucide-react';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface AddressMapProps {
    onLocationSelect: (lat: number, lng: number, address: string) => void;
}

class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(_: Error) {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Map Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-64 bg-gray-100 rounded-xl flex flex-col items-center justify-center text-gray-500 gap-2">
                    <AlertTriangle size={24} className="text-amber-500" />
                    <p className="text-sm">Map failed to load.</p>
                    <p className="text-xs">Please enter address manually below.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const LocationMarker = ({ onSelect }: { onSelect: (lat: number, lng: number) => void }) => {
    const [position, setPosition] = useState<L.LatLng | null>(null);
    const markerRef = useRef<L.Marker>(null);

    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const newPos = marker.getLatLng();
                    setPosition(newPos);
                    onSelect(newPos.lat, newPos.lng);
                }
            },
        }),
        [onSelect],
    );

    const map = useMapEvents({
        click(e) {
            setPosition(e.latlng);
            onSelect(e.latlng.lat, e.latlng.lng);
            map.flyTo(e.latlng, map.getZoom());
        },
    });

    // Return empty fragment instead of null to be safe with react-leaflet v3+ types
    return position === null ? null : (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    );
}

const AddressMapContent: React.FC<AddressMapProps> = ({ onLocationSelect }) => {
    // Default to New Delhi center
    const defaultCenter = { lat: 28.6139, lng: 77.2090 };
    const [loading, setLoading] = useState(false);

    const handleLocationSelect = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            // Reverse geocoding using OpenStreetMap Nominatim
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            onLocationSelect(lat, lng, data.display_name);
        } catch (error) {
            console.error('Geocoding error:', error);
            onLocationSelect(lat, lng, 'Selected Location');
        } finally {
            setLoading(false);
        }
    };

    const handleCurrentLocation = () => {
        setLoading(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    handleLocationSelect(latitude, longitude);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    setLoading(false);
                    alert('Unable to retrieve your location');
                }
            );
        } else {
            setLoading(false);
            alert('Geolocation is not supported by this browser.');
        }
    };

    return (
        <div className="relative border border-gray-200 rounded-xl overflow-hidden">
            <div className="h-64 z-0">
                <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <LocationMarker onSelect={handleLocationSelect} />
                </MapContainer>
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-[1000]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
            )}

            <button
                type="button"
                onClick={handleCurrentLocation}
                className="absolute top-3 right-3 bg-white p-2 rounded-lg shadow-md z-[400] text-gray-700 hover:bg-gray-50 hover:text-teal-600 transition-colors flex items-center gap-2 text-xs font-semibold"
            >
                <MapPin size={14} /> Use My Location
            </button>

            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-[10px] font-medium shadow-sm z-[400] text-gray-500">
                Tap map to pin location
            </div>
        </div>
    );
};

const AddressMap: React.FC<AddressMapProps> = (props) => {
    return (
        <MapErrorBoundary>
            <AddressMapContent {...props} />
        </MapErrorBoundary>
    );
};

export default AddressMap;
