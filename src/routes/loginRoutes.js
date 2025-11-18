import express from "express";
import LoginController from "../controllers/loginController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Inicia sesión con credenciales
 *     description: Autentica usuario y establece cookies HTTP-only con tokens JWT
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
 *                 example: example@example.com
 *               password:
 *                 type: string
 *                 example: "Example!"
 *               rememberMe:
 *                 type: boolean
 *                 example: true
 *                 description: Extiende sesión a 7 días
 *     responses:
 *       200:
 *         description: Login exitoso, tokens en cookies
 *         headers:
 *           Set-Cookie:
 *             description: Cookies de autenticación
 *             schema:
 *               type: string
 *               example: accessToken=xxx; HttpOnly; Secure; SameSite=Strict
 *       400:
 *         description: Campos requeridos faltantes
 *       401:
 *         description: Credenciales incorrectas
 *       403:
 *         description: Cuenta inactiva
 */
router.post("/", LoginController.login);

/**
 * @swagger
 * /login/refresh:
 *   post:
 *     summary: Refresca el access token
 *     description: Genera nuevo access token usando refresh token de cookie
 *     tags:
 *       - Autenticación
 *     responses:
 *       200:
 *         description: Token refrescado
 *       401:
 *         description: Refresh token inválido o expirado
 */
router.post("/refresh", LoginController.refresh);

/**
 * @swagger
 * /login/logout:
 *   post:
 *     summary: Cierra sesión
 *     description: Invalida tokens y limpia cookies
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post("/logout", authMiddleware, LoginController.logout);

/**
 * @swagger
 * /login/me:
 *   get:
 *     summary: Obtiene información del usuario autenticado
 *     description: Retorna información del usuario en req.user
 *     tags:
 *       - Autenticación
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
 *       401:
 *         description: No autenticado
 */
router.get("/me", authMiddleware, LoginController.me);

export default router;