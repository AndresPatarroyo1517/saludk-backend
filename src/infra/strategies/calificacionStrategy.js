import { PromedioSimpleStrategy } from "./promedioCalificacion.js";
import { PromedioPonderadoStrategy } from "./ponderadoCalificacion.js";
import { PromedioSuavizadoStrategy } from "./penalizacionCalificacion.js";
import { BayesianAverageStrategy } from "./bayecianCalificacion.js";

class CalculadoraReputacion {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  calcularPromedio(calificaciones) {
    if (!this.strategy) {
      throw new Error('No se ha definido una estrategia de cálculo');
    }
    return this.strategy.calcular(calificaciones);
  }

  obtenerNombreEstrategia() {
    return this.strategy ? this.strategy.getNombre() : 'Sin estrategia';
  }
}

// Factory
class EstrategiaFactory {
  static crear(tipo, opciones = {}) {
    switch (tipo) {
      case 'simple':
        return new PromedioSimpleStrategy();
      
      case 'ponderado':
        return new PromedioPonderadoStrategy(opciones.factorDecaimiento);
      
      case 'suavizado':
        return new PromedioSuavizadoStrategy(opciones.factor);
      
      case 'bayesian':
        return new BayesianAverageStrategy(
          opciones.promedioGlobal,
          opciones.confianza
        );
      
      default:
        throw new Error(`Estrategia desconocida: ${tipo}`);
    }
  }

  static obtenerDisponibles() {
    return ['simple', 'ponderado', 'suavizado', 'bayesian'];
  }
}

export { CalculadoraReputacion, EstrategiaFactory };
