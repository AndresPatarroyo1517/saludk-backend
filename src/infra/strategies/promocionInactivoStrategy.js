// Strategy que detecta pacientes inactivos y propone una promoción de reactivación
export default async function promocionInactivoStrategy(context) {
  const { paciente, compras = [], historial = null } = context;

  try {
    // Si hay actividad reciente en los últimos 90 días, no aplicar
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - 90);

    const actividadCompras = (compras || []).some(c => {
      if (!c || !c.fecha_creacion) return false;
      return new Date(c.fecha_creacion) >= threshold;
    });

    // Chequear resultados de consultas como actividad alternativa
    let actividadHistorial = false;
    if (historial && historial.resultados_consultas && historial.resultados_consultas.length) {
      actividadHistorial = historial.resultados_consultas.some(r => {
        if (!r || !r.fecha_registro) return false;
        return new Date(r.fecha_registro) >= threshold;
      });
    }

    if (!actividadCompras && !actividadHistorial) {
      return [
        {
          tipo: 'INACTIVO',
          titulo: 'Te extrañamos - promoción de reactivación',
          descripcion: 'Vuelve y recibe un descuento especial para tu próxima compra',
          monto: 20,
        },
      ];
    }

    return [];
  } catch (err) {
    return [];
  }
}
