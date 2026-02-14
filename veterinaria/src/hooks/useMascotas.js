import { useState } from 'react';

export const useMascotas = () => {
  // Iniciamos con los datos que ya tenías
  const [mascotas, setMascotas] = useState([
    { id: 1, nombre: 'Firulais', especie: 'Perro', raza: 'Labrador', dueño: 'Juan Perez' },
    { id: 2, nombre: 'Michi', especie: 'Gato', raza: 'Siamés', dueño: 'Maria Lopez' },
  ]);

  const agregarMascota = (nuevaMascota) => {
    setMascotas([...mascotas, { ...nuevaMascota, id: Date.now() }]);
  };

  const eliminarMascota = (id) => {
    setMascotas(mascotas.filter(m => m.id !== id));
  };

  return {
    mascotas,
    agregarMascota,
    eliminarMascota
  };
};