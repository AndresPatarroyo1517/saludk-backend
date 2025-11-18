import { CalculoReputacionStrategy } from "../reputacionStrategy.js";

class PromedioSuavizadoStrategy extends CalculoReputacionStrategy {
  constructor(factor = 1.5) {
    super();
    this.factor = factor; // Mayor factor = más suavizado
  }

  calcular(calificaciones) {
    if (!calificaciones || calificaciones.length === 0) {
      return 0;
    }

    // Transformar cada puntuación usando sigmoide
    const puntuacionesTransformadas = calificaciones.map(cal => {
      // Normalizar a rango [-1, 1] para aplicar sigmoide
      const normalizada = (cal.puntuacion - 3) / 2;
      const sigmoide = Math.tanh(normalizada / this.factor);
      // Desnormalizar de vuelta a [1, 5]
      return 3 + sigmoide * 2;
    });

    const suma = puntuacionesTransformadas.reduce((acc, p) => acc + p, 0);
    return parseFloat((suma / puntuacionesTransformadas.length).toFixed(2));
  }

  getNombre() {
    return `Promedio Suavizado (factor ${this.factor})`;
  }
}
export { PromedioSuavizadoStrategy };