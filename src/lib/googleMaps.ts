export function openGoogleMaps(lat: number, lng: number) {
  // Esta URL es universal. En celular abrirá la app de mapas nativa.
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  window.open(url, '_blank')
}