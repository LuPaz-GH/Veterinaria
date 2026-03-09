const pool = require('../config/db');

const operacionService = {
    getMascotas: async () => {
        const [rows] = await pool.query('SELECT m.*, d.nombre AS dueno_nombre FROM mascotas m JOIN duenos d ON m.dueno_id = d.id ORDER BY m.nombre ASC');
        return rows;
    },
    crearMascota: async (datos) => {
        const { nombre, especie, raza, dueno_id } = datos;
        const [res] = await pool.query('INSERT INTO mascotas (nombre, especie, raza, dueno_id) VALUES (?, ?, ?, ?)', [nombre, especie, raza, dueno_id]);
        return res.insertId;
    },
    actualizarMascota: async (id, datos) => {
        const { nombre, especie, raza, dueno_id } = datos;
        await pool.query('UPDATE mascotas SET nombre = ?, especie = ?, raza = ?, dueno_id = ? WHERE id = ?', [nombre, especie, raza, dueno_id, id]);
    },
    eliminarMascota: async (id) => { 
        await pool.query('DELETE FROM mascotas WHERE id = ?', [id]); 
    },

    getEstetica: async () => {
        const [rows] = await pool.query(`
            SELECT e.id, e.tipo_servicio AS servicio, e.realizado, e.observaciones, m.nombre AS mascota, d.nombre AS dueno, 
            DATE_FORMAT(t.fecha, '%Y-%m-%d') AS fecha, DATE_FORMAT(t.fecha, '%H:%i') AS hora, m.id AS mascota_id, d.id AS dueno_id, t.id AS turno_id
            FROM estetica e 
            JOIN turnos t ON e.turno_id = t.id 
            JOIN mascotas m ON t.mascota_id = m.id 
            JOIN duenos d ON t.dueno_id = d.id 
            ORDER BY t.fecha ASC`);
        return rows;
    },
    actualizarEstetica: async (id, datos) => {
        const { tipo_servicio, realizado, observaciones } = datos;
        const updates = []; const params = [];
        if (tipo_servicio !== undefined) { updates.push('tipo_servicio = ?'); params.push(tipo_servicio); }
        if (realizado !== undefined) { updates.push('realizado = ?'); params.push(realizado); }
        if (observaciones !== undefined) { updates.push('observaciones = ?'); params.push(observaciones); }
        if (updates.length === 0) return;
        params.push(id);
        await pool.query(`UPDATE estetica SET ${updates.join(', ')} WHERE id = ?`, params);
    },
    eliminarEstetica: async (id) => { 
        await pool.query('DELETE FROM estetica WHERE id = ?', [id]); 
    },

    getTurnos: async () => {
        const [rows] = await pool.query(`
            SELECT t.id, DATE_FORMAT(t.fecha, '%Y-%m-%dT%H:%i:%s') as fecha, t.tipo, t.motivo, t.estado, t.mascota_id, t.dueno_id,
            IFNULL(m.nombre, 'Sin Mascota') as mascota_nombre, IFNULL(d.nombre, 'Sin Dueño') as dueno_nombre
            FROM turnos t LEFT JOIN mascotas m ON t.mascota_id = m.id LEFT JOIN duenos d ON t.dueno_id = d.id 
            WHERE t.tipo != 'estetica' ORDER BY t.fecha ASC`);
        return rows;
    },

    crearTurnoGeneral: async (datos) => {
        const { fecha, tipo, motivo, mascota_id, dueno_id, es_nueva_mascota, mascota_nombre, dueno_nombre, raza } = datos;

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // ────────────────────────────────────────────────────────────────
            //           CHEQUEO DE HORARIO OCUPADO (CORREGIDO: SOLO MISMO TIPO)
            // ────────────────────────────────────────────────────────────────
            const [existentes] = await connection.query(
                `SELECT id FROM turnos 
                 WHERE fecha = ? 
                 AND tipo = ? 
                 AND estado NOT IN ('cancelado', 'realizado')`,
                [fecha, tipo]   // ← filtro clave: solo chequea conflictos del mismo tipo
            );

            if (existentes.length > 0) {
                throw new Error('HORARIO_OCUPADO');
            }
            // ────────────────────────────────────────────────────────────────

            let mId = mascota_id; 
            let dId = dueno_id;

            if (es_nueva_mascota) {
                // 1. Crear Dueño
                const [resD] = await connection.query('INSERT INTO duenos (nombre) VALUES (?)', [dueno_nombre.trim()]);
                dId = resD.insertId;
                
                // 2. Crear Mascota vinculada
                const [resM] = await connection.query(
                    'INSERT INTO mascotas (nombre, dueno_id, especie, raza) VALUES (?, ?, "Perro", ?)', 
                    [mascota_nombre.trim(), dId, raza || 'Mestizo']
                );
                mId = resM.insertId;
            } else if (!dId && mId) {
                const [mascotaData] = await connection.query('SELECT dueno_id FROM mascotas WHERE id = ?', [mId]);
                if (mascotaData.length > 0) dId = mascotaData[0].dueno_id;
            }

            // 3. Crear Turno
            const [resT] = await connection.query(
                'INSERT INTO turnos (fecha, tipo, motivo, estado, mascota_id, dueno_id) VALUES (?, ?, ?, "pendiente", ?, ?)', 
                [fecha, tipo, motivo || 'Turno registrado', mId, dId]
            );
            
            await connection.commit();
            return resT.insertId;
        } catch (e) {
            await connection.rollback();
            if (e.message === 'HORARIO_OCUPADO') {
                throw new Error('El horario seleccionado ya está ocupado para este tipo de servicio.');
            }
            throw e;
        } finally { 
            connection.release(); 
        }
    },

    actualizarTurno: async (id, datos) => {
        const { fecha, motivo, mascota_id, dueno_id } = datos;
        await pool.query('UPDATE turnos SET fecha = ?, motivo = ?, mascota_id = ?, dueno_id = ? WHERE id = ?', [fecha, motivo, mascota_id, dueno_id, id]);
    },
    eliminarTurno: async (id) => { 
        await pool.query('DELETE FROM turnos WHERE id = ?', [id]); 
    },

    getMovimientosCaja: async () => {
        const [rows] = await pool.query(`SELECT c.*, e.nombre AS usuario_nombre, DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada FROM caja c LEFT JOIN empleados e ON c.usuario_id = e.id ORDER BY c.fecha DESC`);
        return rows;
    },
    registrarMovimiento: async (datos) => {
        const { tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id } = datos;
        const [res] = await pool.query('INSERT INTO caja (tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id) VALUES (?, ?, ?, ?, ?, ?)', [tipo_operacion, categoria, descripcion, monto, metodo_pago, usuario_id]);
        return res.insertId;
    },
    actualizarMovimiento: async (id, datos) => {
        const { monto, metodo_pago, descripcion } = datos;
        await pool.query('UPDATE caja SET monto = ?, metodo_pago = ?, descripcion = ? WHERE id = ?', [monto, metodo_pago, descripcion, id]);
    },
    eliminarMovimiento: async (id) => { 
        await pool.query('DELETE FROM caja WHERE id = ?', [id]); 
    },

    getReportesDashboard: async () => {
        const [hoy] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND DATE(fecha) = CURDATE()");
        const [semana] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)");
        const [mes] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())");
        const [anio] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND YEAR(fecha) = YEAR(CURDATE())");
        const [ventasPorDia] = await pool.query("SELECT DATE(fecha) as dia, COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion = 'ingreso' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(fecha) ORDER BY dia ASC");
        const [turnosPorTipo] = await pool.query("SELECT tipo, COUNT(*) as value FROM turnos GROUP BY tipo");
        const [tendencia] = await pool.query("SELECT DATE_FORMAT(fecha, '%b') as mes, COALESCE(SUM(monto), 0) as monto FROM caja WHERE tipo_operacion = 'ingreso' AND fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(fecha, '%Y-%m') ORDER BY fecha ASC");
        const [top] = await pool.query("SELECT categoria as servicio, COALESCE(SUM(monto), 0) as ingresos FROM caja WHERE tipo_operacion = 'ingreso' GROUP BY categoria ORDER BY ingresos DESC LIMIT 5");
        return { 
            totales: { 
                dia: Number(hoy[0]?.total || 0), 
                semana: Number(semana[0]?.total || 0), 
                mes: Number(mes[0]?.total || 0), 
                anio: Number(anio[0]?.total || 0) 
            }, 
            graficoVentas: ventasPorDia, 
            graficoTurnos: turnosPorTipo, 
            tendenciaMensual: tendencia, 
            topServicios: top 
        };
    },

    atenderConsulta: async (id, datos) => {
        const { diagnostico, tratamiento, peso, mascota_id, veterinario_id } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('INSERT INTO historial_clinico (mascota_id, veterinario_id, diagnostico, tratamiento, peso) VALUES (?, ?, ?, ?, ?)', [mascota_id, veterinario_id || null, diagnostico, tratamiento, peso || 0]);
            await connection.query('UPDATE turnos SET estado = "realizado" WHERE id = ?', [id]);
            await connection.commit();
        } catch (e) { 
            await connection.rollback(); 
            throw e; 
        } finally { 
            connection.release(); 
        }
    },

    getHistorial: async (mascotaId) => {
        const [rows] = await pool.query("SELECT h.*, DATE_FORMAT(h.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada FROM historial_clinico h WHERE h.mascota_id = ? ORDER BY h.fecha DESC", [mascotaId]);
        return rows;
    },
    crearHistorial: async (datos) => {
        const { mascota_id, diagnostico, tratamiento, peso } = datos;
        await pool.query('INSERT INTO historial_clinico (mascota_id, diagnostico, tratamiento, peso) VALUES (?, ?, ?, ?)', [mascota_id, diagnostico, tratamiento, peso]);
    },
    actualizarHistorial: async (id, datos) => {
        const { peso, diagnostico, tratamiento } = datos;
        await pool.query('UPDATE historial_clinico SET peso = ?, diagnostico = ?, tratamiento = ? WHERE id = ?', [peso, diagnostico, tratamiento, id]);
    },
    eliminarHistorial: async (id) => { 
        await pool.query('DELETE FROM historial_clinico WHERE id = ?', [id]); 
    }
};

module.exports = operacionService;