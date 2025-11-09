
export const parsearFiltroFecha = (filtro, desde, hasta) => {
    const hoy = new Date();
    let filtros = {};
    switch (filtro) {
        case 'hoy':
            filtros.desde = new Date(hoy.setHours(0, 0, 0, 0));
            filtros.hasta = new Date(hoy.setHours(23, 59, 59, 999));
            break;
        case '7dias':
            filtros.desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            filtros.hasta = new Date();
            break;
        case 'mes':
            filtros.desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
            filtros.hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'personalizado':
            filtros.desde = desde ? new Date(desde) : undefined;
            filtros.hasta = hasta ? new Date(hasta) : undefined;
            break;
        default:
            filtros = {};
    }
    return filtros;
};
