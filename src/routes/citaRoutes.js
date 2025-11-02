import express from "express";
import citaController from "../controllers/citaController.js";

const router = express.Router();

/**
 * @swagger
 * /cita:
 *   post:
 *     summary: Crea una nueva cita médica
 *     tags: [Citas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pacienteId:
 *                 type: string
 *               fecha:
 *                 type: string
 *                 format: date
 *               hora:
 *                 type: string
 *                 example: "10:30"
 *     responses:
 *       201:
 *         description: Cita creada correctamente
 *       400:
 *         description: Error en la solicitud
 */
router.post("/", citaController.agendarCita);


export default router;