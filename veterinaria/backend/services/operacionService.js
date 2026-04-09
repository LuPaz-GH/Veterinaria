const pool = require('../config/db');

// =============================================
// OPERACION SERVICE - VERSIÓN INTEGRAL CORREGIDA
// =============================================

const operacionService = {

    // 1. MASCOTAS
    getMascotas: async () => {
        const [rows] = await pool.query(`
            SELECT m.*, d.nombre AS dueno_nombre, d.dni AS dueno_dni, d.telefono AS dueno_telefono
            FROM mascotas m
            JOIN duenos d ON m.dueno_id = d.id
            WHERE m.activo = 1 AND d.activo = 1
            ORDER BY m.nombre ASC
        `);
        return rows;
    },

    getMascotasEliminadas: async () => {
        const [rows] = await pool.query(`
            SELECT m.*, 
                   d.nombre AS dueno_nombre,
                   e.nombre as responsable_borrado
            FROM mascotas m
            LEFT JOIN duenos d ON m.dueno_id = d.id
            LEFT JOIN empleados e ON m.borrado_por = e.id
            WHERE m.activo = 0
            ORDER BY m.fecha_borrado DESC
        `);
        return rows;
    },

    crearMascota: async (datos) => {
        const { nombre, especie, raza, dueno_id } = datos;
        const [res] = await pool.query(
            'INSERT INTO mascotas (nombre, especie, raza, dueno_id, activo) VALUES (?, ?, ?, ?, 1)',
            [nombre, especie || 'Perro', raza || 'Mestizo', dueno_id]
        );
        return res.insertId;
    },

    actualizarMascota: async (id, datos) => {
        const { nombre, especie, raza, dueno_id } = datos;
        await pool.query(
            'UPDATE mascotas SET nombre = ?, especie = ?, raza = ?, dueno_id = ? WHERE id = ?',
            [nombre, especie, raza, dueno_id, id]
        );
    },

    eliminarMascota: async (id, usuarioId) => {
        await pool.query(
            'UPDATE mascotas SET activo = 0, borrado_por = ?, fecha_borrado = NOW() WHERE id = ?',
            [usuarioId, id]
        );
    },

    restaurarMascota: async (id) => {
        await pool.query(
            'UPDATE mascotas SET activo = 1, borrado_por = NULL, fecha_borrado = NULL WHERE id = ?',
            [id]
        );
    },

    // 2. ESTÉTICA CON PAGINACIÓN
    getEstetica: async (query = {}) => {
        const { fecha, pagina = 1, limite = 20, soloPendientes = 'true' } = query;
        let sql = `
            SELECT e.id, e.tipo_servicio AS servicio, e.realizado, e.observaciones,
                   m.nombre AS mascota, d.nombre AS dueno, d.telefono AS dueno_telefono,
                   DATE_FORMAT(t.fecha, '%Y-%m-%d') AS fecha,
                   DATE_FORMAT(t.fecha, '%H:%i') AS hora,
                   m.id AS mascota_id, d.id AS dueno_id, t.id AS turno_id
            FROM estetica e
            JOIN turnos t ON e.turno_id = t.id
            JOIN mascotas m ON t.mascota_id = m.id
            JOIN duenos d ON t.dueno_id = d.id
            WHERE m.activo = 1 AND d.activo = 1 AND e.fecha_borrado IS NULL AND t.fecha_borrado IS NULL
        `;
        const params = [];
        const conditions = [];

        if (fecha) { conditions.push('DATE(t.fecha) = ?'); params.push(fecha); }
        if (soloPendientes === 'true') { conditions.push('e.realizado < 2'); }

        if (conditions.length > 0) { sql += ' AND ' + conditions.join(' AND '); }

        sql += ` ORDER BY t.fecha ASC LIMIT ? OFFSET ?`;
        params.push(parseInt(limite), (parseInt(pagina) - 1) * parseInt(limite));

        const [rows] = await pool.query(sql, params);

        const countSql = `SELECT COUNT(*) as total FROM estetica e JOIN turnos t ON e.turno_id = t.id JOIN mascotas m ON t.mascota_id = m.id WHERE m.activo = 1 AND e.fecha_borrado IS NULL AND t.fecha_borrado IS NULL` +
            (conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '');
        const [totalResult] = await pool.query(countSql, params.slice(0, -2));

        return {
            data: rows,
            total: totalResult[0].total,
            pagina: parseInt(pagina),
            totalPaginas: Math.ceil(totalResult[0].total / limite)
        };
    },

    crearEstetica: async (datos, usuarioId) => {
        const {
            fecha, hora, tipo_servicio, motivo, mascota_id, dueno_id,
            es_nueva_mascota, mascota_nombre, dueno_nombre, raza
        } = datos;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            let mId = mascota_id;
            let dId = dueno_id;

            if (es_nueva_mascota) {
                const [resD] = await connection.query('INSERT INTO duenos (nombre, activo) VALUES (?, 1)', [dueno_nombre.trim()]);
                dId = resD.insertId;
                const [resM] = await connection.query('INSERT INTO mascotas (nombre, dueno_id, especie, raza, activo) VALUES (?, ?, "Perro", ?, 1)', [mascota_nombre.trim(), dId, raza || 'Mestizo']);
                mId = resM.insertId;

                if (usuarioId) {
                    const [empleado] = await connection.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                    const responsableNombre = empleado[0]?.nombre || 'Sistema';
                    await connection.query(
                        `INSERT INTO auditoria (fecha, producto, accion, responsable, modulo, id_referencia, eliminado) 
                         VALUES (NOW(), ?, 'Creado', ?, 'clientes', ?, 0)`,
                        [`Cliente: ${dueno_nombre.trim()}`, responsableNombre, dId]
                    );
                }
            }

            if (!mId || !dId) {
                await connection.rollback();
                throw new Error('mascota_id y dueno_id son requeridos');
            }

            const fechaHora = hora ? `${fecha} ${hora}:00` : `${fecha} 00:00:00`;

            const [existentes] = await connection.query(
                `SELECT t.id FROM turnos t JOIN estetica e ON e.turno_id = t.id WHERE t.fecha = ? AND t.tipo = 'estetica' AND t.estado NOT IN ('cancelado', 'realizado') AND t.fecha_borrado IS NULL AND e.fecha_borrado IS NULL`,
                [fechaHora]
            );

            if (existentes.length > 0) {
                await connection.rollback();
                throw new Error('HORARIO_OCUPADO');
            }

            const [resT] = await connection.query(
                'INSERT INTO turnos (fecha, tipo, motivo, estado, mascota_id, dueno_id) VALUES (?, "estetica", ?, "pendiente", ?, ?)',
                [fechaHora, motivo || 'Turno de estética', mId, dId]
            );

            const [resE] = await connection.query(
                'INSERT INTO estetica (turno_id, tipo_servicio, realizado) VALUES (?, ?, 0)',
                [resT.insertId, tipo_servicio || 'Baño y Corte Completo']
            );

            await connection.commit();
            return resE.insertId;
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    actualizarEstetica: async (id, datos, usuarioId) => {
        const { tipo_servicio, realizado, observaciones, fecha, hora, comportamiento, peso } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const updatesEstetica = [];
            const paramsEstetica = [];

            if (tipo_servicio !== undefined) { updatesEstetica.push('tipo_servicio = ?'); paramsEstetica.push(tipo_servicio); }
            if (realizado !== undefined) { updatesEstetica.push('realizado = ?'); paramsEstetica.push(realizado); }

            if (comportamiento || peso) {
                const infoExtra = `[Peso: ${peso || 'N/R'}] [Porte: ${comportamiento || 'N/R'}] - ${observaciones || ''}`;
                updatesEstetica.push('observaciones = ?');
                paramsEstetica.push(infoExtra);
            } else if (observaciones !== undefined) {
                updatesEstetica.push('observaciones = ?');
                paramsEstetica.push(observaciones);
            }

            if (updatesEstetica.length > 0) {
                paramsEstetica.push(id);
                await connection.query(`UPDATE estetica SET ${updatesEstetica.join(', ')} WHERE id = ?`, paramsEstetica);
            }

            if (fecha && hora) {
                const fechaHora = `${fecha} ${hora}:00`;
                await connection.query('UPDATE turnos SET fecha = ? WHERE id = (SELECT turno_id FROM estetica WHERE id = ?)', [fechaHora, id]);
            }

            await connection.commit();
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    eliminarEstetica: async (id, usuarioId) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            const [estetica] = await connection.query('SELECT turno_id FROM estetica WHERE id = ?', [id]);
            if (estetica[0]) {
                await connection.query(
                    'UPDATE estetica SET fecha_borrado = NOW(), borrado_por = ? WHERE id = ?',
                    [usuarioId, id]
                );
                await connection.query(
                    'UPDATE turnos SET fecha_borrado = NOW(), borrado_por = ? WHERE id = ?',
                    [usuarioId, estetica[0].turno_id]
                );
            }
            await connection.commit();
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    // 3. TURNOS GENERALES
    getTurnos: async (query = {}) => {
        const { fecha, pagina = 1, limite = 12, soloPendientes = 'true' } = query;
        const offset = (parseInt(pagina) - 1) * parseInt(limite);

        let sql = `
            SELECT t.id, DATE_FORMAT(t.fecha, '%Y-%m-%dT%H:%i:%s') as fecha, t.tipo, t.motivo, t.estado, t.mascota_id, t.dueno_id,
            IFNULL(m.nombre, 'Sin Mascota') as mascota_nombre, IFNULL(d.nombre, 'Sin Dueño') as dueno_nombre,
            d.telefono AS dueno_telefono
            FROM turnos t
            LEFT JOIN mascotas m ON t.mascota_id = m.id
            LEFT JOIN duenos d ON t.dueno_id = d.id
            WHERE t.tipo != 'estetica' AND t.fecha_borrado IS NULL AND (m.activo = 1 OR m.id IS NULL) AND (d.activo = 1 OR d.id IS NULL)
        `;
        const params = [];
        const conditions = [];
        if (fecha) { conditions.push('DATE(t.fecha) = ?'); params.push(fecha); }
        if (soloPendientes === 'true') { conditions.push("t.estado NOT IN ('realizado', 'cancelado')"); }
        if (conditions.length > 0) { sql += ' AND ' + conditions.join(' AND '); }

        const countSql = `SELECT COUNT(*) as total FROM turnos t LEFT JOIN mascotas m ON t.mascota_id = m.id WHERE t.tipo != 'estetica' AND t.fecha_borrado IS NULL` +
            (conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : '');
        const [totalResult] = await pool.query(countSql, params);
        const total = totalResult[0].total;

        sql += ` ORDER BY t.fecha ASC LIMIT ? OFFSET ?`;
        const [rows] = await pool.query(sql, [...params, parseInt(limite), offset]);

        return { 
            data: rows, 
            total: total, 
            pagina: parseInt(pagina), 
            totalPaginas: Math.ceil(total / limite) || 1 
        };
    },

    getTurnosEliminados: async () => {
        const [rows] = await pool.query(`
            SELECT t.id, DATE_FORMAT(t.fecha, '%Y-%m-%dT%H:%i:%s') as fecha, t.tipo, t.motivo, t.estado, 
                   t.mascota_id, t.dueno_id, t.fecha_borrado, t.borrado_por,
                   IFNULL(m.nombre, 'Sin Mascota') as mascota_nombre, 
                   IFNULL(d.nombre, 'Sin Dueño') as dueno_nombre,
                   d.telefono AS dueno_telefono,
                   e.nombre as responsable_borrado,
                   est.tipo_servicio as servicio
            FROM turnos t
            LEFT JOIN mascotas m ON t.mascota_id = m.id
            LEFT JOIN duenos d ON t.dueno_id = d.id
            LEFT JOIN empleados e ON t.borrado_por = e.id
            LEFT JOIN estetica est ON est.turno_id = t.id
            WHERE t.fecha_borrado IS NOT NULL
            ORDER BY t.fecha_borrado DESC
        `);
        return rows;
    },

    restaurarTurno: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query(
                'UPDATE turnos SET fecha_borrado = NULL, borrado_por = NULL WHERE id = ?',
                [id]
            );
            await connection.query(
                'UPDATE estetica SET fecha_borrado = NULL, borrado_por = NULL WHERE turno_id = ?',
                [id]
            );
            await connection.commit();
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    eliminarTurnoPermanente: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('DELETE FROM estetica WHERE turno_id = ?', [id]);
            await connection.query('DELETE FROM turnos WHERE id = ?', [id]);
            await connection.commit();
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    crearTurnoGeneral: async (datos) => {
        const { fecha, tipo, motivo, mascota_id, dueno_id, es_nueva_mascota, mascota_nombre, dueno_nombre, raza } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            let mId = mascota_id; 
            let dId = dueno_id;

            if (es_nueva_mascota) {
                const [resD] = await connection.query('INSERT INTO duenos (nombre, activo) VALUES (?, 1)', [dueno_nombre.trim()]);
                dId = resD.insertId;
                const [resM] = await connection.query('INSERT INTO mascotas (nombre, dueno_id, especie, raza, activo) VALUES (?, ?, "Perro", ?, 1)', [mascota_nombre.trim(), dId, raza || 'Mestizo']);
                mId = resM.insertId;
            }

            const [resT] = await connection.query(
                'INSERT INTO turnos (fecha, tipo, motivo, estado, mascota_id, dueno_id) VALUES (?, ?, ?, "pendiente", ?, ?)',
                [fecha, tipo, motivo || 'Turno registrado', mId, dId]
            );

            const turnoId = resT.insertId;

            const usuarioId = datos.usuario_id || null;
            if (usuarioId) {
                const [empleado] = await connection.query('SELECT nombre FROM empleados WHERE id = ?', [usuarioId]);
                const responsable = empleado[0]?.nombre || 'Sistema';

                let mascotaNombre = 'Sin mascota';
                if (mId) {
                    const [masc] = await connection.query('SELECT nombre FROM mascotas WHERE id = ?', [mId]);
                    mascotaNombre = masc[0]?.nombre || 'Sin mascota';
                }

                await connection.query(
                    `INSERT INTO auditoria 
                     (fecha, producto, mascota, accion, responsable, modulo, id_referencia, eliminado) 
                     VALUES (NOW(), ?, ?, 'Creado', ?, 'turnos', ?, 0)`,
                    [`Turno: ${tipo}`, mascotaNombre, responsable, turnoId]
                );
            }

            await connection.commit();
            return turnoId;
        } catch (e) { 
            await connection.rollback(); 
            throw e; 
        } finally { 
            connection.release(); 
        }
    },

    // 4. CAJA
    getMovimientosCaja: async () => {
        const [rows] = await pool.query(`
            SELECT *, DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') as fecha_formateada 
            FROM caja 
            WHERE fecha_borrado IS NULL 
            ORDER BY fecha DESC
        `);
        return rows;
    },

    getMovimientosCajaBorrados: async () => {
        const [rows] = await pool.query(`
            SELECT c.*, e.nombre as borrado_por_nombre 
            FROM caja c 
            LEFT JOIN empleados e ON c.borrado_por = e.id 
            WHERE c.fecha_borrado IS NOT NULL 
            ORDER BY c.fecha_borrado DESC
        `);
        return rows;
    },

    registrarMovimiento: async (datos) => {
        const { tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id } = datos;
        const [res] = await pool.query(
            `INSERT INTO caja 
             (fecha, tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id) 
             VALUES (NOW(), ?, ?, ?, ?, ?, ?)`,
            [tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id]
        );
        return res.insertId;
    },

    actualizarMovimiento: async (id, datos) => {
        const { descripcion, monto, metodo_pago } = datos;
        await pool.query(
            `UPDATE caja 
             SET descripcion = ?, monto = ?, metodo_pago = ? 
             WHERE id = ?`,
            [descripcion, monto, metodo_pago, id]
        );
    },

    eliminarMovimiento: async (id, usuarioId) => {
        await pool.query(
            `UPDATE caja 
             SET fecha_borrado = NOW(), borrado_por = ? 
             WHERE id = ?`,
            [usuarioId, id]
        );
    },

    restaurarMovimientoCaja: async (id) => {
        await pool.query(
            `UPDATE caja 
             SET fecha_borrado = NULL, borrado_por = NULL 
             WHERE id = ?`,
            [id]
        );
    },

    // 5. HISTORIAL CLÍNICO (CORREGIDO)
    getHistorial: async (mascotaId) => {
        const [rows] = await pool.query(`
            SELECT id, diagnostico, tratamiento, peso, veterinario_id, mascota_id, fecha,
            DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha_formateada
            FROM historial_clinico 
            WHERE mascota_id = ? AND activo = 1
            ORDER BY fecha DESC
        `, [mascotaId]);
        return rows;
    },

    getHistorialEliminado: async (mascotaId) => {
        const [rows] = await pool.query(`
            SELECT id, diagnostico, tratamiento, peso,
            DATE_FORMAT(fecha, '%d/%m/%Y %H:%i') AS fecha_formateada
            FROM historial_clinico 
            WHERE mascota_id = ? AND activo = 0
            ORDER BY fecha DESC
        `, [mascotaId]);
        return rows;
    },

    crearHistorial: async (datos) => {
        const { diagnostico, tratamiento, peso, veterinario_id, mascota_id } = datos;
        const [res] = await pool.query(
            'INSERT INTO historial_clinico (diagnostico, tratamiento, peso, veterinario_id, mascota_id, fecha, activo) VALUES (?, ?, ?, ?, ?, NOW(), 1)',
            [diagnostico, tratamiento || '', peso || 0, veterinario_id, mascota_id]
        );
        return res.insertId;
    },

    actualizarHistorial: async (id, datos) => {
        const { diagnostico, tratamiento, peso } = datos;
        await pool.query(
            'UPDATE historial_clinico SET diagnostico = ?, tratamiento = ?, peso = ? WHERE id = ?',
            [diagnostico, tratamiento, peso, id]
        );
    },

    eliminarHistorial: async (id, usuarioId) => {
        await pool.query(
            'UPDATE historial_clinico SET activo = 0, borrado_por = ?, fecha_borrado = NOW() WHERE id = ?',
            [usuarioId, id]
        );
    },

    restaurarHistorial: async (id) => {
        await pool.query(
            'UPDATE historial_clinico SET activo = 1, borrado_por = NULL, fecha_borrado = NULL WHERE id = ?',
            [id]
        );
    }
};

module.exports = operacionService;