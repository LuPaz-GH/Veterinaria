const pool = require('../config/db');

const operacionService = {

    // 1. Obtener mascotas activas con su dueño activo
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

    // 2. Estética con paginación
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
                // SOFT DELETE en estetica
                await connection.query(
                    'UPDATE estetica SET fecha_borrado = NOW(), borrado_por = ? WHERE id = ?',
                    [usuarioId, id]
                );
                // SOFT DELETE en el turno asociado
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

    // 3. Turnos Generales (CORREGIDO PARA PAGINACIÓN REAL)
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

        // Contar el total de registros para calcular páginas
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

    // =============================================
    // NUEVAS FUNCIONES PARA TURNO ELIMINADOS (PAPELERA)
    // =============================================

    // Obtener turnos eliminados (para la papelera)
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

    // Restaurar un turno (quitar el borrado lógico en AMBAS TABLAS)
    restaurarTurno: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // 1. Restaurar en tabla turnos
            await connection.query(
                'UPDATE turnos SET fecha_borrado = NULL, borrado_por = NULL WHERE id = ?',
                [id]
            );

            // 2. Restaurar también en tabla estetica (donde turno_id coincida)
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

    // =============================================
    // FIN NUEVAS FUNCIONES
    // =============================================

    crearTurnoGeneral: async (datos) => {
        const { fecha, tipo, motivo, mascota_id, dueno_id, es_nueva_mascota, mascota_nombre, dueno_nombre, raza } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            let mId = mascota_id; let dId = dueno_id;
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
            await connection.commit();
            return resT.insertId;
        } catch (e) { await connection.rollback(); throw e; } finally { connection.release(); }
    },

    actualizarTurno: async (id, datos) => {
        const { fecha, motivo, mascota_id, dueno_id } = datos;
        await pool.query('UPDATE turnos SET fecha = ?, motivo = ?, mascota_id = ?, dueno_id = ? WHERE id = ?', [fecha, motivo, mascota_id, dueno_id, id]);
    },

    eliminarTurno: async (id, usuarioId) => {
        await pool.query(
            'UPDATE turnos SET fecha_borrado = NOW(), borrado_por = ? WHERE id = ?',
            [usuarioId, id]
        );
    },

    // CAJA
    getMovimientosCaja: async () => {
        const [rows] = await pool.query(`SELECT c.*, e.nombre AS usuario_nombre, DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada FROM caja c LEFT JOIN empleados e ON c.usuario_id = e.id WHERE c.fecha_borrado IS NULL ORDER BY c.fecha DESC`);
        return rows;
    },

    registrarMovimiento: async (datos) => {
        const { tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id } = datos;
        const [res] = await pool.query('INSERT INTO caja (tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id, fecha) VALUES (?, ?, ?, ?, ?, ?, NOW())', [tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id]);
        return res.insertId;
    },

    actualizarMovimiento: async (id, datos) => {
        const { tipo_operacion, categoria, descripcion, monto, metodo_pago } = datos;
        await pool.query('UPDATE caja SET tipo_operacion = ?, categoria = ?, descripcion = ?, monto = ?, metodo_pago = ? WHERE id = ?', [tipo_operacion, categoria, descripcion, monto, metodo_pago, id]);
    },

    eliminarMovimiento: async (id, usuarioId) => {
        await pool.query(
            'UPDATE caja SET fecha_borrado = NOW(), borrado_por = ? WHERE id = ?',
            [usuarioId, id]
        );
    },

    // =============================================
    // PAPELERA DE CAJA - FUNCIONES AGREGADAS
    // =============================================

    getMovimientosCajaBorrados: async () => {
        const [rows] = await pool.query(`
            SELECT c.*, 
                   e.nombre AS usuario_nombre,
                   e2.nombre AS borrado_por_nombre,
                   DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada,
                   DATE_FORMAT(c.fecha_borrado, '%d/%m/%Y %H:%i') AS fecha_borrado_formateada
            FROM caja c
            LEFT JOIN empleados e ON c.usuario_id = e.id
            LEFT JOIN empleados e2 ON c.borrado_por = e2.id
            WHERE c.fecha_borrado IS NOT NULL
            ORDER BY c.fecha_borrado DESC
        `);
        return rows;
    },

    restaurarMovimientoCaja: async (id) => {
        await pool.query(
            'UPDATE caja SET fecha_borrado = NULL, borrado_por = NULL WHERE id = ?',
            [id]
        );
    },

    // DASHBOARD
    getReportesDashboard: async () => {
        const [hoy] = await pool.query("SELECT SUM(monto) as total FROM caja WHERE tipo_operacion='ingreso' AND DATE(fecha) = CURDATE() AND fecha_borrado IS NULL");
        const [semana] = await pool.query("SELECT SUM(monto) as total FROM caja WHERE tipo_operacion='ingreso' AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1) AND fecha_borrado IS NULL");
        const [mes] = await pool.query("SELECT SUM(monto) as total FROM caja WHERE tipo_operacion='ingreso' AND MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE()) AND fecha_borrado IS NULL");
        const [anio] = await pool.query("SELECT SUM(monto) as total FROM caja WHERE tipo_operacion='ingreso' AND YEAR(fecha) = YEAR(CURDATE()) AND fecha_borrado IS NULL");
        const [ventasPorDia] = await pool.query("SELECT DATE(fecha) as dia, SUM(monto) as total FROM caja WHERE tipo_operacion = 'ingreso' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND fecha_borrado IS NULL GROUP BY DATE(fecha) ORDER BY dia ASC");
        const [turnosPorTipo] = await pool.query("SELECT tipo, COUNT(*) as value FROM turnos WHERE fecha_borrado IS NULL GROUP BY tipo");

        return {
            totales: { dia: Number(hoy[0]?.total || 0), semana: Number(semana[0]?.total || 0), mes: Number(mes[0]?.total || 0), anio: Number(anio[0]?.total || 0) },
            graficoVentas: ventasPorDia,
            graficoTurnos: turnosPorTipo
        };
    },

    // HISTORIAL CLÍNICO
    atenderConsulta: async (id, datos) => {
        const { diagnostico, tratamiento, peso, mascota_id, veterinario_id } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('INSERT INTO historial_clinico (mascota_id, veterinario_id, diagnostico, tratamiento, peso, fecha) VALUES (?, ?, ?, ?, ?, NOW())', [mascota_id, veterinario_id || null, diagnostico, tratamiento, peso || 0]);
            await connection.query('UPDATE turnos SET estado = "realizado" WHERE id = ?', [id]);
            await connection.commit();
        } catch (e) { await connection.rollback(); throw e; } finally { connection.release(); }
    },

    getHistorial: async (mascotaId) => {
        const [rows] = await pool.query(`
            SELECT h.*, e.nombre as veterinario_nombre, 
            DATE_FORMAT(h.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada 
            FROM historial_clinico h 
            LEFT JOIN empleados e ON h.veterinario_id = e.id 
            WHERE h.mascota_id = ? AND h.fecha_borrado IS NULL
            ORDER BY h.fecha DESC`, 
            [mascotaId]
        );
        return rows;
    },

    crearHistorial: async (datos) => {
        const { mascota_id, veterinario_id, diagnostico, tratamiento, peso } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Insertar historial
            const [res] = await connection.query(
                'INSERT INTO historial_clinico (mascota_id, veterinario_id, diagnostico, tratamiento, peso, fecha) VALUES (?, ?, ?, ?, ?, NOW())',
                [mascota_id, veterinario_id, diagnostico, tratamiento, peso]
            );
            
            // 2. Obtener nombre de la mascota
            const [mascotaData] = await connection.query(
                'SELECT nombre FROM mascotas WHERE id = ?',
                [mascota_id]
            );
            
            // 3. Obtener nombre del veterinario
            const [vetData] = await connection.query(
                'SELECT nombre FROM empleados WHERE id = ?',
                [veterinario_id]
            );
            
            // 4. Registrar en auditoría
            await connection.query(
                `INSERT INTO auditoria (
                    fecha, producto, mascota, categoria, accion, responsable, modulo, id_referencia, eliminado
                ) VALUES (
                    NOW(), ?, ?, 'consulta', 'Creado', ?, 'historial', ?, 0
                )`,
                [
                    `Consulta: ${diagnostico.substring(0, 50)}`,
                    mascotaData[0]?.nombre || 'Desconocida',
                    vetData[0]?.nombre || 'Sistema',
                    res.insertId
                ]
            );
            
            await connection.commit();
            return res.insertId;
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    actualizarHistorial: async (id, datos) => {
        const { diagnostico, tratamiento, peso } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Actualizar historial
            await connection.query(
                'UPDATE historial_clinico SET diagnostico = ?, tratamiento = ?, peso = ? WHERE id = ?',
                [diagnostico, tratamiento, peso, id]
            );
            
            // 2. Obtener datos para auditoría
            const [historialData] = await connection.query(
                `SELECT h.mascota_id, h.veterinario_id, m.nombre as mascota_nombre, e.nombre as vet_nombre 
                 FROM historial_clinico h 
                 LEFT JOIN mascotas m ON h.mascota_id = m.id 
                 LEFT JOIN empleados e ON h.veterinario_id = e.id 
                 WHERE h.id = ?`,
                [id]
            );
            
            // 3. Registrar en auditoría
            await connection.query(
                `INSERT INTO auditoria (
                    fecha, producto, mascota, categoria, accion, responsable, modulo, id_referencia, eliminado
                ) VALUES (
                    NOW(), ?, ?, 'consulta', 'Editado', ?, 'historial', ?, 0
                )`,
                [
                    `Consulta: ${diagnostico.substring(0, 50)}`,
                    historialData[0]?.mascota_nombre || 'Desconocida',
                    historialData[0]?.vet_nombre || 'Sistema',
                    id
                ]
            );
            
            await connection.commit();
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    eliminarHistorial: async (id, usuarioId) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Obtener datos antes de eliminar
            const [historialData] = await connection.query(
                `SELECT h.mascota_id, h.veterinario_id, h.diagnostico, m.nombre as mascota_nombre, e.nombre as vet_nombre 
                 FROM historial_clinico h 
                 LEFT JOIN mascotas m ON h.mascota_id = m.id 
                 LEFT JOIN empleados e ON h.veterinario_id = e.id 
                 WHERE h.id = ?`,
                [id]
            );
            
            // 2. SOFT DELETE (borrado lógico)
            await connection.query(
                'UPDATE historial_clinico SET fecha_borrado = NOW(), borrado_por = ? WHERE id = ?',
                [usuarioId, id]
            );
            
            // 3. Registrar en auditoría
            if (historialData[0]) {
                await connection.query(
                    `INSERT INTO auditoria (
                        fecha, producto, mascota, categoria, accion, responsable, modulo, id_referencia, eliminado
                    ) VALUES (
                        NOW(), ?, ?, 'consulta', 'Eliminado', ?, 'historial', ?, 1
                    )`,
                    [
                        `Consulta: ${historialData[0].diagnostico.substring(0, 50)}`,
                        historialData[0].mascota_nombre || 'Desconocida',
                        historialData[0].vet_nombre || 'Sistema',
                        id
                    ]
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

    // =============================================
    // GESTIÓN DE EMPLEADOS CON AUDITORÍA
    // =============================================

    getEmpleados: async () => {
        const [rows] = await pool.query(`
            SELECT id, nombre, usuario, email, rol, activo, fecha_creacion 
            FROM empleados 
            WHERE activo = 1
            ORDER BY nombre ASC
        `);
        return rows;
    },

    crearEmpleado: async (datos) => {
        const { nombre, usuario, password, email, rol } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Insertar empleado
            const [res] = await connection.query(
                'INSERT INTO empleados (nombre, usuario, password, email, rol, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, 1, NOW())',
                [nombre, usuario, password, email || null, rol]
            );
            
            // 2. Registrar en auditoría
            await connection.query(
                `INSERT INTO auditoria (
                    fecha, producto, categoria, accion, responsable, modulo, id_referencia, eliminado
                ) VALUES (
                    NOW(), ?, ?, 'Creado', 'Sistema', 'empleados', ?, 0
                )`,
                [
                    `Empleado: ${nombre}`,
                    rol,
                    res.insertId
                ]
            );
            
            await connection.commit();
            return res.insertId;
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    },

    actualizarEmpleado: async (id, datos) => {
        const { nombre, usuario, email, rol, activo } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Obtener datos actuales antes de actualizar
            const [empleadoData] = await connection.query(
                'SELECT nombre, rol, activo FROM empleados WHERE id = ?',
                [id]
            );
            
            // 2. Actualizar empleado
            await connection.query(
                'UPDATE empleados SET nombre = ?, usuario = ?, email = ?, rol = ?, activo = ? WHERE id = ?',
                [nombre, usuario, email, rol, activo, id]
            );
            
            // 3. Registrar en auditoría
            if (empleadoData[0]) {
                await connection.query(
                    `INSERT INTO auditoria (
                        fecha, producto, categoria, accion, responsable, modulo, id_referencia, eliminado
                    ) VALUES (
                        NOW(), ?, ?, 'Editado', 'Sistema', 'empleados', ?, 0
                    )`,
                    [
                        `Empleado: ${nombre}`,
                        rol,
                        id
                    ]
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

    eliminarEmpleado: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Obtener datos antes de eliminar
            const [empleadoData] = await connection.query(
                'SELECT nombre, rol, activo FROM empleados WHERE id = ?',
                [id]
            );
            
            // 2. Eliminar empleado (soft delete - desactivar)
            await connection.query(
                'UPDATE empleados SET activo = 0 WHERE id = ?',
                [id]
            );
            
            // 3. Registrar en auditoría
            if (empleadoData[0]) {
                await connection.query(
                    `INSERT INTO auditoria (
                        fecha, producto, categoria, accion, responsable, modulo, id_referencia, eliminado
                    ) VALUES (
                        NOW(), ?, ?, 'Eliminado', 'Sistema', 'empleados', ?, 1
                    )`,
                    [
                        `Empleado: ${empleadoData[0].nombre}`,
                        empleadoData[0].rol,
                        id
                    ]
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

    restaurarEmpleado: async (id) => {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            
            // 1. Obtener datos del empleado
            const [empleadoData] = await connection.query(
                'SELECT nombre, rol FROM empleados WHERE id = ?',
                [id]
            );
            
            // 2. Restaurar empleado
            await connection.query(
                'UPDATE empleados SET activo = 1 WHERE id = ?',
                [id]
            );
            
            // 3. Registrar en auditoría
            if (empleadoData[0]) {
                await connection.query(
                    `INSERT INTO auditoria (
                        fecha, producto, categoria, accion, responsable, modulo, id_referencia, eliminado
                    ) VALUES (
                        NOW(), ?, ?, 'Restaurado', 'Sistema', 'empleados', ?, 0
                    )`,
                    [
                        `Empleado: ${empleadoData[0].nombre}`,
                        empleadoData[0].rol,
                        id
                    ]
                );
            }
            
            await connection.commit();
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    }

};

module.exports = operacionService;