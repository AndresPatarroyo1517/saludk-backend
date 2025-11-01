import loginService from "../services/loginService.js";

class LoginController { 

async login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son obligatorios" });
    }

    const result = await loginService.login(email, password);
    res.status(200).json(result);
  } catch (error) {
    res.status(error.status || 500).json({
      message: error.message || "Error al iniciar sesión",
    });
  }
}
}
export default new LoginController();
