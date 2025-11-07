/**
 * tipo: 'hoy' | 'ultimos7' | 'mes' | 'personalizado'
 * fecha_inicio, fecha_fin: 'YYYY-MM-DD'
 * tz: IANA (usamos aproximación con toLocaleString)
 */
export function computeDateRangeFromTipo({ tipo, fecha_inicio, fecha_fin, tz = 'America/Bogota' }) {
    const now = new Date();
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tz }));

    let start, end;

    switch ((tipo || '').toLowerCase()) {
        case 'hoy': {
            const s = new Date(localNow);
            s.setHours(0, 0, 0, 0);
            const e = new Date(localNow);
            e.setHours(23, 59, 59, 999);
            start = s; end = e;
            break;
        }
        case 'ultimos7': {
            const s = new Date(localNow);
            s.setDate(s.getDate() - 6);
            s.setHours(0, 0, 0, 0);
            const e = new Date(localNow);
            e.setHours(23, 59, 59, 999);
            start = s; end = e;
            break;
        }
        case 'mes': {
            const s = new Date(localNow.getFullYear(), localNow.getMonth(), 1);
            s.setHours(0, 0, 0, 0);
            const e = new Date(localNow);
            e.setHours(23, 59, 59, 999);
            start = s; end = e;
            break;
        }
        case 'personalizado': {
            if (!fecha_inicio || !fecha_fin) {
                throw new Error('fecha_inicio y fecha_fin son obligatorias cuando tipo=personalizado');
            }
            const s = new Date(fecha_inicio);
            const e = new Date(fecha_fin);
            s.setHours(0, 0, 0, 0);
            e.setHours(23, 59, 59, 999);
            start = s; end = e;
            break;
        }
        default:
            throw new Error('tipo de fecha inválido. Usa: hoy | ultimos7 | mes | personalizado');
    }

    return {
        range: { from: start, to: end, tz, dateFilter: tipo }
    };
}