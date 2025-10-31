import { revisarSolicitudAutomaticamente } from "../services/validacionService.js";
import { FacadeBasesExternas } from "../infra/fachada/fachadaBasesExternas.jsjs";
import { AdaptadorBDNN } from "../infra/adapters/adaptadorBDNN.jsjs";
import { AdaptadorPolicia } from "../infra/adapters/adaptadorPolicia.js";

/**
 * Facade + Adapters (mismo contrato en ambos: consultarPaciente => { antecedentes: [] }).
 * La Facade deriva policia.tieneFraude a partir de antecedentes.
 */
const fachada = new FacadeBasesExternas({
    adaptadorClinico: new AdaptadorBDNN({
        baseUrl: process.env.EXTERNAL_API_BD_NACIONAL
    }),
    adaptadorPolicia: new AdaptadorPolicia({
        baseUrl: process.env.EXTERNAL_API_ANTECEDENTES
    }),
    // Opcional: palabras clave para considerar "fraude" al derivar desde antecedentes
    fraudeKeywords: ['fraude', 'estafa', 'falsificación']
});

export const revisar = async (req, res, next) => {
    try {
        const { id } = req.params;   // id de solicitud_registro
        const userId = req.user?.id; // si tienes auth
        const salida = await revisarSolicitudAutomaticamente(id, { fachada, userId });
        res.status(200).json(salida);
    } catch (err) {
        next(err);
    }
};