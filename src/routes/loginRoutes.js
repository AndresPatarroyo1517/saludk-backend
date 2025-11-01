import express from "express";
import LoginController from "../controllers/loginController.js";

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Inicia sesión con las credenciales del usuario.
 *     description: Verifica las credenciales del usuario y devuelve un token JWT u otro tipo de respuesta de autenticación.
 *     tags:
 *       - Autenticación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@example.com
 *                 description: Correo electrónico del usuario.
 *               password:
 *                 type: string
 *                 example: "123456"
 *                 description: Contraseña del usuario.
 *     responses:
 *       200:
 *         description: Inicio de sesión exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: string
 *                       example: "admin@example.com"
 *                     nombre:
 *                       type: string
 *                       example: "Andrés Muñoz"
 *                     rol:
 *                       type: string
 *                       example: "Administrador"
 *       400:
 *         description: Faltan campos requeridos o formato inválido.
 *       401:
 *         description: Credenciales incorrectas.
 *       500:
 *         description: Error interno del servidor.
 */


router.post("/", LoginController.login);

export default router;