import { useState, useEffect, useRef } from 'react'
import './App.css'
import { watchCurrentPosition, clearWatch } from './lib/geolocation'
import { openGoogleMaps } from './lib/googleMaps'
import MapView, { type SavedLocation } from './components/MapView'
import Login, { type UserSession } from './components/Login' // IMPORTAMOS EL LOGIN

export default function App() {
  // 1. ESTADO DE SESIÓN
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)

  // ESTADOS DE LA APP
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'admin'>('map')
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const [watchId, setWatchId] = useState<number | null>(null)
  const [focusLocation, setFocusLocation] = useState<SavedLocation | null>(null)
  const [draftLocation, setDraftLocation] = useState<{ lat: number, lng: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [locations, setLocations] = useState<SavedLocation[]>(() => {
    try {
      const saved = localStorage.getItem('@roadrunner:locations')
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null)
  const [formData, setFormData] = useState({ name: '', address: '', photo: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem('@roadrunner:locations', JSON.stringify(locations))
  }, [locations])

  const filteredLocations = locations.filter(loc => 
    loc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    loc.address.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function toggleGps() {
    if (isTracking && watchId !== null) {
      clearWatch(watchId); setWatchId(null); setIsTracking(false); return
    }
    try {
      const id = watchCurrentPosition(
        (result) => {
          setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude })
          setIsTracking(true)
        },
        (error) => alert(`Error GPS: ${error.message}`)
      )
      setWatchId(id)
    } catch (e) { alert('No se pudo iniciar el GPS.') }
  }

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result as string }))
      reader.readAsDataURL(file)
    }
  }

  const openCreateModal = () => {
    if(!position && !draftLocation) return alert('Activa el GPS o haz clic en el mapa.')
    setEditingLocation(null)
    setFormData({ name: '', address: '', photo: '' })
    setIsModalOpen(true)
  }

  const openEditModal = (loc: SavedLocation, e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentUser?.role === 'viewer') return alert('No tienes permisos para editar.')
    if (currentUser?.role === 'driver' && loc.createdBy !== currentUser.name) {
      return alert('Solo puedes editar las direcciones que tú has registrado.')
    }
    setEditingLocation(loc)
    setFormData({ name: loc.name, address: loc.address, photo: loc.photo || '' })
    setIsModalOpen(true)
  }

  const saveLocation = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingLocation) {
      setLocations(locations.map(loc => 
        loc.id === editingLocation.id 
          ? { ...loc, name: formData.name, address: formData.address, photo: formData.photo } 
          : loc
      ))
      alert('¡Dirección actualizada!')
    } else {
      let finalLat, finalLng;
      if (draftLocation) { finalLat = draftLocation.lat; finalLng = draftLocation.lng; } 
      else if (position) { finalLat = position.latitude; finalLng = position.longitude; } 
      else { return alert('Selecciona un punto.') }
      
      const newLocation: SavedLocation = {
        id: Date.now().toString(), ...formData,
        latitude: finalLat, longitude: finalLng, status: 'pending',
        createdBy: currentUser?.name || 'Desconocido'
      }
      setLocations([...locations, newLocation])
      alert('¡Dirección registrada!')
    }
    
    setIsModalOpen(false)
    setFormData({ name: '', address: '', photo: '' })
    setDraftLocation(null)
  }

  const approveLocation = (id: string) => {
    setLocations(locations.map(loc => loc.id === id ? { ...loc, status: 'approved' } : loc))
  }

  const deleteLocation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentUser?.role === 'viewer') return alert('No tienes permisos.')
    
    const locToDelete = locations.find(l => l.id === id);
    if (currentUser?.role === 'driver' && locToDelete?.createdBy !== currentUser.name) {
      return alert('Solo puedes eliminar tus propios registros.');
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar esta dirección?')) {
      setLocations(locations.filter(loc => loc.id !== id));
    }
  }

  const viewOnMap = (loc: SavedLocation) => {
    setFocusLocation(loc)
    setActiveTab('map')
    setSearchQuery('')
  }

  // --- RENDERIZADO DEL LOGIN ---
  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />
  }

  // --- APP PRINCIPAL ---
  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">ROADRUNNER</div>
        <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
          <button className={`gps-btn ${isTracking ? 'active' : ''}`} onClick={toggleGps}>
            {isTracking ? '📍 GPS Activo' : '📍 GPS'}
          </button>
          <button className="logout-btn" onClick={() => setCurrentUser(null)} title="Cerrar Sesión">
            {currentUser.role === 'admin' ? '👑' : currentUser.role === 'driver' ? '🚚' : '👀'} Salir
          </button>
        </div>
      </header>

      <div className="content-area">
        {activeTab === 'map' && (
          <>
            <div className="search-container">
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input type="text" placeholder="Buscar dirección..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                {searchQuery && <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>}
              </div>
              
              {searchQuery && (
                <div className="search-results">
                  {filteredLocations.length > 0 ? filteredLocations.map(loc => (
                      <div key={loc.id} className="search-item" onClick={() => viewOnMap(loc)}>
                        <div><strong>{loc.name}</strong><p>{loc.address}</p></div><span>➔</span>
                      </div>
                    )) : <div className="no-results">No se encontraron direcciones</div>}
                </div>
              )}
            </div>

            <MapView position={position} locations={searchQuery ? filteredLocations : locations} focusLocation={focusLocation} draftLocation={draftLocation} onMapClick={(lat, lng) => setDraftLocation({ lat, lng })} />
            
            {draftLocation && <div className="manual-alert">📌 Punto seleccionado<button onClick={() => setDraftLocation(null)}>X</button></div>}
            
            {currentUser.role !== 'viewer' && (
              <button className="fab-button" onClick={openCreateModal}>+</button>
            )}
          </>
        )}

        {activeTab === 'list' && (
          <div className="tab-page">
            <h2>Registros</h2>
            <p className="subtitle">Direcciones en el sistema</p>
            <div className="list-container">
              {locations.map(loc => (
                <div key={loc.id} className="list-card">
                  <div className="list-info" onClick={() => viewOnMap(loc)} style={{ flex: 1 }}>
                    <h3>{loc.name}</h3>
                    <p>{loc.address}</p>
                    <p style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>Por: {loc.createdBy}</p>
                    <span className={`status-badge ${loc.status}`}>{loc.status === 'approved' ? 'Aprobado' : 'Pendiente'}</span>
                  </div>
                  <div className="card-actions">
                    <button className="btn-action-nav" onClick={() => openGoogleMaps(loc.latitude, loc.longitude)}>🧭</button>
                    {currentUser.role !== 'viewer' && (
                      <>
                        <button className="btn-action-edit" onClick={(e) => openEditModal(loc, e)}>✏️</button>
                        <button className="btn-action-del" onClick={(e) => deleteLocation(loc.id, e)}>🗑️</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="tab-page admin-page">
            <h2>Panel Admin</h2>
            <div className="stats-grid">
              <div className="stat-card"><span>Total</span><strong>{locations.length}</strong></div>
              <div className="stat-card warning"><span>Pendientes</span><strong>{locations.filter(l => l.status === 'pending').length}</strong></div>
            </div>
            <h3>Control de Calidad</h3>
            <div className="list-container">
              {locations.map(loc => (
                <div key={loc.id} className={`list-card admin-card ${loc.status === 'approved' ? 'border-approved' : ''}`}>
                  <div style={{ flex: 1 }}>
                    <h4>{loc.name} <span className={`status-badge ${loc.status}`}>{loc.status}</span></h4>
                    <p>{loc.address} | Por: {loc.createdBy}</p>
                  </div>
                  <div className="admin-actions">
                    {loc.status === 'pending' && <button className="approve-btn" onClick={() => approveLocation(loc.id)}>Aprobar</button>}
                    <button className="btn-action-edit" onClick={(e) => openEditModal(loc, e)}>✏️</button>
                    <button className="btn-action-del" onClick={(e) => deleteLocation(loc.id, e)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="bottom-nav">
        <button className={activeTab === 'map' ? 'active' : ''} onClick={() => { setActiveTab('map'); setFocusLocation(null); }}>🗺️ Mapa</button>
        <button className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>📋 Lista</button>
        {currentUser.role === 'admin' && (
          <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>👑 Admin</button>
        )}
      </nav>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingLocation ? 'Editar Dirección' : 'Nueva Dirección'}</h2>
            <form onSubmit={saveLocation}>
              <label>Nombre / Referencia (Ej: 47C)</label>
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              <label>Contrada / Dirección</label>
              <input type="text" placeholder="Ej: Via Ziccardi 83" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} required />
              <label>Foto de referencia</label>
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={handlePhoto} style={{ display: 'none' }} />
              <button type="button" className="camera-btn" onClick={() => fileInputRef.current?.click()}>📷 {formData.photo ? 'Cambiar Foto' : 'Abrir Cámara'}</button>
              {formData.photo && <img src={formData.photo} alt="Preview" className="photo-preview" />}
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="save-btn">{editingLocation ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}