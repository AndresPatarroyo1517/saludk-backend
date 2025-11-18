import { CalculoReputacionStrategy } from "../reputacionStrategy.js";

class BayesianAverageStrategy extends CalculoReputacionStrategy {
  constructor(promedioGlobal = 3.5, confianza = 10) {
    super();
    this.promedioGlobal = promedioGlobal; // Promedio de toda la plataforma
    this.confianza = confianza; // "Calificaciones ficticias" del prior
  }

  calcular(calificaciones) {
    if (!calificaciones || calificaciones.length === 0) {
      return this.promedioGlobal;
    }

    const n = calificaciones.length;
    const suma = calificaciones.reduce((acc, cal) => acc + cal.puntuacion, 0);

    const resultado = (this.confianza * this.promedioGlobal + suma) / (this.confianza + n);
    return parseFloat(resultado.toFixed(2));
  }

  getNombre() {
    return `Bayesian Average (prior=${this.promedioGlobal}, C=${this.confianza})`;
  }
}
export { BayesianAverageStrategy };
