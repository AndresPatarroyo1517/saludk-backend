class CalculoReputacionStrategy {
  calcular(calificaciones) {
    throw new Error('El método calcular() debe ser implementado');
  }

  getNombre() {
    throw new Error('El método getNombre() debe ser implementado');
  }
}

export { 
  CalculoReputacionStrategy,
};