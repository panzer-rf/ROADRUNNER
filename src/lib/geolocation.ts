export function watchCurrentPosition(
  onSuccess: (position: GeolocationPosition) => void,
  onError: (error: GeolocationPositionError) => void
): number {
  if (!('geolocation' in navigator)) {
    throw new Error('Este navegador no ofrece geolocalización.')
  }

  // watchPosition monitorea el GPS constantemente
  return navigator.geolocation.watchPosition(onSuccess, onError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  })
}

export function clearWatch(watchId: number) {
  navigator.geolocation.clearWatch(watchId)
}