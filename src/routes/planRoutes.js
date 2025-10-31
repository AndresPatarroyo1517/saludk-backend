const express = require('express');
const router = express.Router();
const db = require('../models/index');
const logger = require('../utils/logger');

/**
 * @swagger
 * tags:
 *   name: Planes
 *   description: Endpoints para consultar planes de suscripción
 */

/**
 * @swagger
 * /planes:
 *   get:
 *     summary: Listar planes disponibles
 *     description: Devuelve los planes activos con sus beneficios y precios.
 *     tags: [Planes]
 *     responses:
 *       200:
 *         description: Lista de planes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/', async (req, res) => {
  try {
    const planes = await db.Plan.findAll({
      where: { activo: true },
      attributes: ['id', 'nombre', 'codigo', 'descripcion', 'precio_mensual', 'duracion_meses', 'beneficios', 'consultas_virtuales_incluidas', 'consultas_presenciales_incluidas']
    });

    return res.json({ success: true, data: planes });
  } catch (error) {
    logger.error('Error al listar planes:', error.message);
    return res.status(500).json({ success: false, error: 'Error al listar planes.' });
  }
});

/**
 * @swagger
 * /planes/{id}:
 *   get:
 *     summary: Obtener detalles de un plan
 *     tags: [Planes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del plan
 *       404:
 *         description: Plan no encontrado
 */
router.get('/:id', async (req, res) => {
  try {
    const plan = await db.Plan.findByPk(req.params.id);
    if (!plan || !plan.activo) {
      return res.status(404).json({ success: false, error: 'Plan no encontrado.' });
    }
    return res.json({ success: true, data: plan });
  } catch (error) {
    logger.error('Error al obtener plan:', error.message);
    return res.status(500).json({ success: false, error: 'Error al obtener plan.' });
  }
});

module.exports = router;
