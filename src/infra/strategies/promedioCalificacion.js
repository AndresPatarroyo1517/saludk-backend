import { CalculoReputacionStrategy } from "../reputacionStrategy.js";

class PromedioSimpleStrategy extends CalculoReputacionStrategy {
    calcular(calificaciones) {
        if (!calificaciones || calificaciones.length === 0) {
            return 0;
        }

        const suma = calificaciones.reduce((acc, cal) => acc + cal.puntuacion, 0);
        return parseFloat((suma / calificaciones.length).toFixed(2));
    }

    getNombre() {
        return 'Promedio Simple';
    }
}

export { PromedioSimpleStrategy };
