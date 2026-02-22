import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, AlertTriangle, Loader, Navigation } from 'lucide-react';

// Fix Leaflet default icon issue with bundlers
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = L.icon({
    iconUrl,
    iconRetinaUrl: iconRetina,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    tooltipAnchor: [16, -28],
    shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// =========== TYPES ===========
interface AddressParts {
    road?: string;
    area?: string;
    city?: string;
    state?: string;
    pincode?: string;
    building?: string;
    landmark?: string;
}

interface AddressMapProps {
    onLocationSelect: (lat: number, lng: number, address: string, parts?: AddressParts) => void;
    initialCenter?: { lat: number; lng: number };
    initialZoom?: number;
}

// =========== ERROR BOUNDARY ===========
class MapErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(_: Error) { return { hasError: true }; }
    componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Map Error:", error, errorInfo); }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    height: 200, borderRadius: 'var(--radius-lg)', background: 'var(--bg)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--text-secondary)', gap: 8, border: '1px solid var(--border)',
                }}>
                    <AlertTriangle size={24} color="#f59e0b" />
                    <p style={{ fontSize: '0.875rem' }}>Map failed to load.</p>
                    <p style={{ fontSize: '0.75rem' }}>Please enter address manually below.</p>
                </div>
            );
        }
        return this.props.children;
    }
}

// =========== REVERSE GEOCODE ===========
async function reverseGeocode(lat: number, lng: number): Promise<{ displayName: string; parts: AddressParts }> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        const a = data.address || {};
        const parts: AddressParts = {
            road: a.road || a.pedestrian || a.street || '',
            area: a.suburb || a.neighbourhood || a.quarter || a.hamlet || a.village || '',
            city: a.city || a.town || a.municipality || a.county || '',
            state: a.state || '',
            pincode: a.postcode || '',
            building: a.building || a.house_number ? `${a.house_number || ''} ${a.building || ''}`.trim() : '',
            landmark: a.amenity || a.shop || a.leisure || '',
        };
        return { displayName: data.display_name || 'Selected Location', parts };
    } catch (error) {
        console.error('Geocoding error:', error);
        return { displayName: 'Selected Location', parts: {} };
    }
}

// =========== MAIN MAP (VANILLA LEAFLET) ===========
const AddressMapContent: React.FC<AddressMapProps> = ({ onLocationSelect, initialCenter, initialZoom }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedAddr, setSelectedAddr] = useState('');

    const center: [number, number] = initialCenter
        ? [initialCenter.lat, initialCenter.lng]
        : [28.6139, 77.2090];

    // Initialize map once
    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: center,
            zoom: initialZoom || 13,
            zoomControl: true,
            scrollWheelZoom: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
            maxZoom: 19,
        }).addTo(map);

        // Click handler
        map.on('click', async (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            placeMarker(map, lat, lng);
            setLoading(true);
            const { displayName, parts } = await reverseGeocode(lat, lng);
            setSelectedAddr(displayName);
            onLocationSelect(lat, lng, displayName, parts);
            setLoading(false);
        });

        mapRef.current = map;

        // Fix tiles not loading when map is in a modal (Leaflet needs invalidateSize)
        setTimeout(() => {
            map.invalidateSize();
        }, 300);

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const placeMarker = (map: L.Map, lat: number, lng: number) => {
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else {
            markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map);

            // Drag-end handler
            markerRef.current.on('dragend', async () => {
                const pos = markerRef.current!.getLatLng();
                setLoading(true);
                const { displayName, parts } = await reverseGeocode(pos.lat, pos.lng);
                setSelectedAddr(displayName);
                onLocationSelect(pos.lat, pos.lng, displayName, parts);
                setLoading(false);
            });
        }
        map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });
    };

    const handleCurrentLocation = () => {
        setLoading(true);
        if (!navigator.geolocation) {
            setLoading(false);
            alert('Geolocation is not supported by this browser.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                if (mapRef.current) {
                    placeMarker(mapRef.current, latitude, longitude);
                }
                const { displayName, parts } = await reverseGeocode(latitude, longitude);
                setSelectedAddr(displayName);
                onLocationSelect(latitude, longitude, displayName, parts);
                setLoading(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                setLoading(false);
                alert('Unable to retrieve your location. Please allow location access.');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    return (
        <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {/* Map */}
            <div ref={mapContainerRef} style={{ height: 200, width: '100%' }} />

            {/* Loading overlay */}
            {loading && (
                <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '8px 16px', borderRadius: 'var(--radius-full)', boxShadow: 'var(--shadow-md)', fontSize: '0.813rem', fontWeight: 600 }}>
                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        Locating...
                    </div>
                </div>
            )}

            {/* Use My Location button */}
            <button
                type="button"
                onClick={handleCurrentLocation}
                style={{
                    position: 'absolute', top: 12, right: 12,
                    background: 'white', padding: '8px 12px', borderRadius: 'var(--radius-md)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)', zIndex: 400,
                    color: 'var(--text)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    fontSize: '0.75rem', fontWeight: 600,
                }}
            >
                <Navigation size={14} /> Use My Location
            </button>

            {/* Hint label */}
            <div style={{
                position: 'absolute', bottom: 12, left: 12,
                background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)',
                padding: '4px 12px', borderRadius: 'var(--radius-full)',
                fontSize: '0.688rem', fontWeight: 500, color: 'var(--text-secondary)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)', zIndex: 400,
                display: 'flex', alignItems: 'center', gap: 4,
            }}>
                <MapPin size={10} /> Tap on the map to pin your location
            </div>

            {/* Selected location preview */}
            {selectedAddr && (
                <div style={{
                    padding: '8px 12px', background: 'hsl(174, 62%, 96%)',
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                    <MapPin size={12} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                    <span style={{ lineHeight: 1.4 }}>{selectedAddr}</span>
                </div>
            )}
        </div>
    );
};

// =========== EXPORT WITH ERROR BOUNDARY ===========
const AddressMap: React.FC<AddressMapProps> = (props) => {
    return (
        <MapErrorBoundary>
            <AddressMapContent {...props} />
        </MapErrorBoundary>
    );
};

export default AddressMap;
