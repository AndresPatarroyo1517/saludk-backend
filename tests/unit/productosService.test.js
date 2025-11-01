import productosService from '../../src/services/productosService.js';
import productoRepository from '../../src/repositories/productoRepository.js';
import proveedorAdapter from '../../src/jobs/proveedorAdapter.js';

jest.mock('../../src/repositories/productoRepository.js');
jest.mock('../../src/jobs/proveedorAdapter.js');

describe('ProductosService', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test('consultarCatalogo enriquece productos con disponibilidad', async () => {
    const sampleProducts = [
      {
        id: 'prod-1',
        nombre: 'Paracetamol',
        precio: 1000,
        ingredientes: ['paracetamol'],
        efectos_secundarios: ['somnolencia'],
        cantidad_disponible: 5,
      },
      {
        id: 'prod-2',
        nombre: 'Ibuprofeno',
        precio: 1500,
        ingredientes: ['ibuprofeno'],
        efectos_secundarios: ['nausea'],
        cantidad_disponible: 0,
      },
    ];

    productoRepository.findAll.mockResolvedValue(sampleProducts);
    proveedorAdapter.consultarDisponibilidad.mockResolvedValue({ 'prod-1': 5, 'prod-2': 0 });

    const result = await productosService.consultarCatalogo({});

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'prod-1', disponible: true, cantidad_disponible: 5 });
    expect(result[1]).toMatchObject({ id: 'prod-2', disponible: false, cantidad_disponible: 0 });
  });
});
