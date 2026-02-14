const pool = require('../config/db'); // IMPORTACIÓN DIRECTA PARA EVITAR SYNTAXERROR

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
    eliminarMascota: async (id) => { await pool.query('DELETE FROM mascotas WHERE id = ?', [id]); },

    getEstetica: async () => {
        const [rows] = await pool.query(`
            SELECT e.id, e.tipo_servicio, e.realizado, m.nombre AS mascota, d.nombre AS dueno, 
            DATE_FORMAT(t.fecha, '%Y-%m-%dT%H:%i:%s') AS hora, m.id AS mascota_id, d.id AS dueno_id, t.id AS turno_id
            FROM estetica e JOIN turnos t ON e.turno_id = t.id JOIN mascotas m ON t.mascota_id = m.id
            JOIN duenos d ON t.dueno_id = d.id ORDER BY t.fecha ASC
        `);
        return rows;
    },

    // CORREGIDO: Permite actualizar estado (realizado) o campos de edición
    actualizarEstetica: async (id, datos) => {
        const { tipo_servicio, realizado } = datos;
        const updates = [];
        const params = [];
        if (tipo_servicio !== undefined) { updates.push('tipo_servicio = ?'); params.push(tipo_servicio); }
        if (realizado !== undefined) { updates.push('realizado = ?'); params.push(realizado); }
        if (updates.length === 0) return;
        params.push(id);
        await pool.query(`UPDATE estetica SET ${updates.join(', ')} WHERE id = ?`, params);
    },

    eliminarEstetica: async (id) => { await pool.query('DELETE FROM estetica WHERE id = ?', [id]); },

    getTurnos: async () => {
        const [rows] = await pool.query(`
            SELECT t.id, DATE_FORMAT(t.fecha, '%Y-%m-%dT%H:%i:%s') as fecha, t.tipo, t.motivo, t.estado, t.mascota_id, t.dueno_id,
            IFNULL(m.nombre, 'Sin Mascota') as mascota_nombre, IFNULL(d.nombre, 'Sin Dueño') as dueno_nombre
            FROM turnos t LEFT JOIN mascotas m ON t.mascota_id = m.id LEFT JOIN duenos d ON t.dueno_id = d.id 
            WHERE t.tipo != 'estetica' -- CORREGIDO: Evita que aparezcan turnos de estética aquí
            ORDER BY t.fecha ASC
        `);
        return rows;
    },

    crearTurnoGeneral: async (datos) => {
        const { fecha, tipo, motivo, mascota_id, dueno_id, es_nueva_mascota, mascota_nombre, dueno_nombre, tipo_servicio } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            let mId = mascota_id, dId = dueno_id;
            if (es_nueva_mascota) {
                const [resD] = await connection.query('INSERT INTO duenos (nombre) VALUES (?)', [dueno_nombre]);
                dId = resD.insertId;
                const [resM] = await connection.query('INSERT INTO mascotas (nombre, dueno_id, especie) VALUES (?, ?, "Perro")', [mascota_nombre, dId]);
                mId = resM.insertId;
            }
            const [resT] = await connection.query('INSERT INTO turnos (fecha, tipo, motivo, estado, mascota_id, dueno_id) VALUES (?, ?, ?, "pendiente", ?, ?)', [fecha, tipo, motivo, mId, dId]);
            if (tipo === 'estetica') {
                // CORREGIDO: Se asegura que tipo_servicio no sea null
                await connection.query('INSERT INTO estetica (turno_id, tipo_servicio, precio, realizado) VALUES (?, ?, 0, 0)', [resT.insertId, tipo_servicio || 'Servicio General']);
            }
            await connection.commit();
            return resT.insertId;
        } catch (e) { await connection.rollback(); throw e; } finally { connection.release(); }
    },

    actualizarTurno: async (id, datos) => {
        const { fecha, motivo, mascota_id, dueno_id } = datos;
        await pool.query('UPDATE turnos SET fecha = ?, motivo = ?, mascota_id = ?, dueno_id = ? WHERE id = ?', [fecha, motivo, mascota_id, dueno_id, id]);
    },

    eliminarTurno: async (id) => { await pool.query('DELETE FROM turnos WHERE id = ?', [id]); },

    getMovimientosCaja: async () => {
        const [rows] = await pool.query("SELECT c.*, e.nombre AS usuario_nombre, DATE_FORMAT(c.fecha, '%d/%m/%Y %H:%i') AS fecha_formateada FROM caja c LEFT JOIN empleados e ON c.usuario_id = e.id ORDER BY c.fecha DESC");
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

    eliminarMovimiento: async (id) => { await pool.query('DELETE FROM caja WHERE id = ?', [id]); },

    getReportesDashboard: async () => {
        const [hoy] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND DATE(fecha) = CURDATE()");
        const [semana] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND YEARWEEK(fecha, 1) = YEARWEEK(CURDATE(), 1)");
        const [mes] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())");
        const [anio] = await pool.query("SELECT COALESCE(SUM(monto), 0) as total FROM caja WHERE tipo_operacion='ingreso' AND YEAR(fecha) = YEAR(CURDATE())");
        return { totales: { dia: hoy[0].total, semana: semana[0].total, mes: mes[0].total, anio: anio[0].total } };
    },

    atenderConsulta: async (id, datos) => {
        const { diagnostico, tratamiento, peso, mascota_id } = datos;
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();
            await connection.query('INSERT INTO historial_clinico (mascota_id, diagnostico, tratamiento, peso) VALUES (?, ?, ?, ?)', [mascota_id, diagnostico, tratamiento, peso]);
            await connection.query('UPDATE turnos SET estado = "realizado" WHERE id = ?', [id]);
            await connection.commit();
        } catch (e) { await connection.rollback(); throw e; } finally { connection.release(); }
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

    eliminarHistorial: async (id) => { await pool.query('DELETE FROM historial_clinico WHERE id = ?', [id]); }
};

module.exports = operacionService;