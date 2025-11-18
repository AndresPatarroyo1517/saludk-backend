import { CalculoReputacionStrategy } from "../reputacionStrategy.js";

class PromedioPonderadoStrategy extends CalculoReputacionStrategy {
  constructor(factorDecaimiento = 180) {
    super();
    // Factor de decaimiento en días (default: 180 días)
    // Calificaciones de hace 180 días tendrán ~37% del peso de una actual
    this.factorDecaimiento = factorDecaimiento;
  }

  calcular(calificaciones) {
    if (!calificaciones || calificaciones.length === 0) {
      return 0;
    }

    const ahora = new Date();
    let sumaPonderada = 0;
    let sumaPesos = 0;

    calificaciones.forEach(cal => {
      const diasAntiguedad = (ahora - new Date(cal.fecha_creacion)) / (1000 * 60 * 60 * 24);
      const peso = Math.exp(-diasAntiguedad / this.factorDecaimiento);
      
      sumaPonderada += cal.puntuacion * peso;
      sumaPesos += peso;
    });

    return sumaPesos > 0 
      ? parseFloat((sumaPonderada / sumaPesos).toFixed(2))
      : 0;
  }

  getNombre() {
    return `Promedio Ponderado (decaimiento ${this.factorDecaimiento} días)`;
  }
}

export { PromedioPonderadoStrategy };