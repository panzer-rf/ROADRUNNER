import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { openGoogleMaps } from '../lib/googleMaps'

import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'
const DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })
L.Marker.prototype.options.icon = DefaultIcon

const gpsIcon = L.divIcon({
  className: 'custom-gps-icon',
  html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>',
  iconSize: [22, 22], iconAnchor: [11, 11]
})

const draftIcon = L.divIcon({
  className: 'custom-draft-icon',
  html: '<div style="background-color: #475569; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; color: white; font-size: 12px;">📍</div>',
  iconSize: [30, 30], iconAnchor: [15, 15]
})

const createAddressIcon = (text: string, isApproved: boolean) => {
  const bgColor = isApproved ? '#10b981' : '#f59e0b';
  const displayText = text.length > 4 ? text.substring(0, 4) : text;

  return L.divIcon({
    className: 'custom-address-icon',
    html: `
      <div style="
        background-color: ${bgColor};
        width: 40px; height: 40px; border-radius: 50%;
        border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex; justify-content: center; align-items: center;
        color: white; font-weight: 700; font-size: 14px;
        font-family: 'Inter', sans-serif; letter-spacing: -0.5px;
      ">
        ${displayText}
      </div>
    `,
    iconSize: [46, 46], iconAnchor: [23, 23],
  });
};

type Position = { latitude: number; longitude: number }
export type SavedLocation = Position & { id: string; name: string; address: string; photo?: string; status: 'pending' | 'approved', createdBy: string }

const italyCenter: [number, number] = [42.5, 12.5]

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click(e) { onMapClick(e.latlng.lat, e.latlng.lng) } })
  return null
}

function CenterMap({ position, focusLocation }: { position: Position | null, focusLocation: SavedLocation | null }) {
  const map = useMap()
  useEffect(() => {
    if (focusLocation) { map.flyTo([focusLocation.latitude, focusLocation.longitude], 18, { duration: 1.5 }) } 
    else if (position) { map.flyTo([position.latitude, position.longitude], 16, { duration: 1.5 }) }
  }, [position, focusLocation, map])
  return null
}

interface MapViewProps {
  position: Position | null
  locations: SavedLocation[]
  focusLocation: SavedLocation | null
  draftLocation: { lat: number, lng: number } | null
  onMapClick: (lat: number, lng: number) => void
}

export default function MapView({ position, locations, focusLocation, draftLocation, onMapClick }: MapViewProps) {
  const gpsPosition: [number, number] | null = position ? [position.latitude, position.longitude] : null
  const initialCenter = gpsPosition || italyCenter
  const initialZoom = gpsPosition ? 16 : 6

  return (
    <div className="map-frame">
      <MapContainer center={initialCenter} zoom={initialZoom} scrollWheelZoom>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onMapClick={onMapClick} />
        <CenterMap position={position} focusLocation={focusLocation} />
        
        {gpsPosition && (
          <Marker position={gpsPosition} icon={gpsIcon}><Popup>Tu posición actual (GPS)</Popup></Marker>
        )}

        {draftLocation && (
          <Marker position={[draftLocation.lat, draftLocation.lng]} icon={draftIcon}>
            <Popup>Punto seleccionado manualmente</Popup>
          </Marker>
        )}

        {locations.map((loc) => (
          <Marker key={loc.id} position={[loc.latitude, loc.longitude]} icon={createAddressIcon(loc.name, loc.status === 'approved')}>
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong style={{ fontSize: '14px' }}>{loc.name}</strong><br />
                <span style={{ fontSize: '12px', color: '#666' }}>{loc.address}</span><br />
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: loc.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                  {loc.status === 'approved' ? '✅ APROBADO' : '⏳ PENDIENTE'}
                </span><br/>
                {loc.photo && <img src={loc.photo} style={{width: '100%', maxWidth: '120px', borderRadius: '8px', marginTop: '8px', marginBottom: '8px'}} alt="Ref" />}
                <button 
                  onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', width: '100%', marginTop: '5px' }}>
                  🧭 Navegar aquí
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}