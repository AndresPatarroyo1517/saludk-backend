import { Cita, Compra, CalificacionMedico, CalificacionProducto, Suscripcion, SolicitudRegistro } from "../models/index.js";
import { Op } from "sequelize";

export const countCitasAgendadas = async (filtros = {}) => {
    const where = { estado: 'AGENDADA' };
    if (filtros.desde || filtros.hasta) {
        where.fecha_creacion = {};
        if (filtros.desde) where.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) where.fecha_creacion[Op.lte] = filtros.hasta;
    }
    return Cita.count({ where });
};

export const resumenCitas = async (filtros = {}) => {
    const estados = ['AGENDADA', 'COMPLETADA', 'CANCELADA'];
    const whereBase = {};
    if (filtros.desde || filtros.hasta) {
        whereBase.fecha_creacion = {};
        if (filtros.desde) whereBase.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) whereBase.fecha_creacion[Op.lte] = filtros.hasta;
    }

    const total = await Cita.count({ where: whereBase });
    const counts = {};
    for (const estado of estados) {
        counts[estado] = await Cita.count({ where: { ...whereBase, estado } });
    }

    return {
        total,
        agendadas: counts['AGENDADA'] || 0,
        completadas: counts['COMPLETADA'] || 0,
        canceladas: counts['CANCELADA'] || 0
    };
};

export const ingresosTotales = async (filtros = {}) => {
    const where = { estado: 'PAGADA' };
    if (filtros.desde || filtros.hasta) {
        where.fecha_creacion = {};
        if (filtros.desde) where.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) where.fecha_creacion[Op.lte] = filtros.hasta;
    }

    const result = await Compra.sum('subtotal', { where });
    return result || 0;
};

export const calificacionPromedioMedicos = async (filtros = {}) => {
    const where = {};
    if (filtros.desde || filtros.hasta) {
        where.fecha_creacion = {};
        if (filtros.desde) where.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) where.fecha_creacion[Op.lte] = filtros.hasta;
    }

    const result = await CalificacionMedico.findAll({
        attributes: [[CalificacionMedico.sequelize.fn('AVG', CalificacionMedico.sequelize.col('puntuacion')), 'promedio']],
        where,
        raw: true
    });

    return parseFloat(result[0].promedio) || 0;
};

export const calificacionPromedioProductos = async (filtros = {}) => {
    const where = {};
    if (filtros.desde || filtros.hasta) {
        where.fecha_creacion = {};
        if (filtros.desde) where.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) where.fecha_creacion[Op.lte] = filtros.hasta;
    }

    const result = await CalificacionProducto.findAll({
        attributes: [[CalificacionProducto.sequelize.fn('AVG', CalificacionProducto.sequelize.col('puntuacion')), 'promedio']],
        where,
        raw: true
    });

    return parseFloat(result[0].promedio) || 0;
};

export const pacientesSuscripcion = async (filtros = {}) => {
    const where = { estado: 'ACTIVA' };
    if (filtros.desde || filtros.hasta) {
        where.fecha_creacion = {};
        if (filtros.desde) where.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) where.fecha_creacion[Op.lte] = filtros.hasta;
    }

    const PLAN_PREMIUM_ID = 'c5d2a0c8-6b71-4d45-9b43-bb3e3a0e6b12';
    const PLAN_ESTANDARD_ID = '874ce33a-b97a-4624-b3d7-3692d4c0fa5e';

    const total = await Suscripcion.count({ where });
    const premium = await Suscripcion.count({ where: { ...where, plan_id: PLAN_PREMIUM_ID } });
    const estandar = await Suscripcion.count({ where: { ...where, plan_id: PLAN_ESTANDARD_ID } });

    return { total, premium, estandar };
};

export const solicitudesResumen = async (filtros = {}) => {
    const estados = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'DEVUELTA'];
    const whereBase = {};
    if (filtros.desde || filtros.hasta) {
        whereBase.fecha_creacion = {};
        if (filtros.desde) whereBase.fecha_creacion[Op.gte] = filtros.desde;
        if (filtros.hasta) whereBase.fecha_creacion[Op.lte] = filtros.hasta;
    }

    const total = await SolicitudRegistro.count({ where: whereBase });
    const counts = {};
    for (const estado of estados) {
        counts[estado] = await SolicitudRegistro.count({ where: { ...whereBase, estado } });
    }

    return counts;
};
