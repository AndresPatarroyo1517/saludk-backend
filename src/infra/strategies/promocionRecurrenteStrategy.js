// Strategy que detecta compras recurrentes y propone promociones relacionadas
export default async function promocionRecurrenteStrategy(context) {
  const { paciente, compras = [] } = context;

  try {
    if (!compras || compras.length === 0) return [];

    // Agrupar por productoId y contar
    const counts = {};
    for (const c of compras) {
      if (!c || (!c.productos || c.productos.length === 0)) continue;
      // cada compra tiene productos en compra_productos con campo producto_id
      for (const p of c.productos) {
        const id = p.producto_id || p.productId || p.id;
        if (!id) continue;
        counts[id] = (counts[id] || 0) + (p.cantidad ? Number(p.cantidad) : 1);
      }
    }

  const recurrentes = Object.entries(counts).filter(([, v]) => v >= 3);
    if (recurrentes.length === 0) return [];

    // Generar una promoción por producto recurrente
    return recurrentes.map(([productId]) => ({
      tipo: 'RECURRENTE',
      titulo: 'Oferta para producto recurrente',
      descripcion: `Descuento en producto ${productId} por compras recurrentes`,
      productoId,
      monto: 15,
    }));
  } catch (err) {
    return [];
  }
}
