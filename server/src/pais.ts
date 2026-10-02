// País aproximado de un jugador a partir de la zona horaria y el idioma de su navegador.
// No se usa ni se guarda la dirección IP (más privado y suficiente para las estadísticas).

const ZONAS: Record<string, string> = {
  'America/Guayaquil': 'EC', 'Pacific/Galapagos': 'EC', 'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Caracas': 'VE',
  'America/La_Paz': 'BO', 'America/Santiago': 'CL', 'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'America/Montevideo': 'UY',
  'America/Asuncion': 'PY', 'America/Sao_Paulo': 'BR', 'America/Panama': 'PA', 'America/Costa_Rica': 'CR', 'America/Guatemala': 'GT',
  'America/El_Salvador': 'SV', 'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Mexico_City': 'MX', 'America/Monterrey': 'MX',
  'America/Tijuana': 'MX', 'America/Cancun': 'MX', 'America/Havana': 'CU', 'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR',
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Europe/Lisbon': 'PT', 'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'Asia/Tokyo': 'JP',
};

/** Código de país (ISO de 2 letras) o '??' si no se puede saber. */
export function paisDe(zona: string, idioma: string): string {
  if (ZONAS[zona]) return ZONAS[zona];
  if (/^America\/(New_York|Chicago|Denver|Los_Angeles|Phoenix|Detroit|Anchorage)/.test(zona)) return 'US';
  const region = /^[a-z]{2,3}-([A-Z]{2})$/.exec(idioma)?.[1];
  return region ?? '??';
}
