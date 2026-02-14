-- 1. Recrear la base limpia
DROP DATABASE IF EXISTS malfi_vet;
CREATE DATABASE malfi_vet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE malfi_vet;

-- 2. Tablas (todas con IF NOT EXISTS por seguridad)
CREATE TABLE IF NOT EXISTS duenos_veterinaria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    cuil VARCHAR(20) UNIQUE,
    participacion_porcentaje DECIMAL(5,2)
);

CREATE TABLE IF NOT EXISTS empleados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin', 'veterinario', 'recepcionista', 'peluquero') NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS duenos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    dni VARCHAR(20) UNIQUE,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion TEXT,
    notas TEXT,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mascotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dueno_id INT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    especie VARCHAR(50) NOT NULL,
    raza VARCHAR(100),
    fecha_nacimiento DATE,
    sexo ENUM('macho', 'hembra', 'no aplica') DEFAULT 'no aplica',
    esterilizado TINYINT(1) DEFAULT 0,
    color VARCHAR(50),
    foto VARCHAR(255),
    notas TEXT,
    FOREIGN KEY (dueno_id) REFERENCES duenos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS turnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascota_id INT,
    dueno_id INT NOT NULL,
    empleado_id INT,
    fecha DATETIME NOT NULL,
    tipo ENUM('consulta', 'vacunacion', 'estetica', 'cirugia', 'urgencia', 'control') NOT NULL,
    estado ENUM('pendiente', 'confirmado', 'cancelado', 'realizado') DEFAULT 'pendiente',
    motivo TEXT,
    notas TEXT,
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE SET NULL,
    FOREIGN KEY (dueno_id) REFERENCES duenos(id) ON DELETE CASCADE,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS estetica (
    id INT AUTO_INCREMENT PRIMARY KEY,
    turno_id INT NOT NULL,
    tipo_servicio VARCHAR(100) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    realizado TINYINT(1) DEFAULT 0,
    peluquero_id INT,
    notas TEXT,
    FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE CASCADE,
    FOREIGN KEY (peluquero_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS productos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    categoria ENUM('petshop', 'alimentos', 'medicamentos', 'accesorios', 'otros') NOT NULL,
    precio_compra DECIMAL(10,2),
    precio_venta DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    proveedor VARCHAR(150),
    codigo_barras VARCHAR(50),
    activo TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS alimentos (
    producto_id INT PRIMARY KEY,
    tipo ENUM('seco', 'humedo', 'snacks', 'suplementos'),
    etapa ENUM('cachorro', 'adulto', 'senior', 'especial'),
    sabor VARCHAR(100),
    peso DECIMAL(5,2),
    fecha_vencimiento DATE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medicamentos (
    producto_id INT PRIMARY KEY,
    principio_activo VARCHAR(150),
    forma VARCHAR(50),
    dosis VARCHAR(100),
    fecha_vencimiento DATE,
    requiere_receta TINYINT(1) DEFAULT 0,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    total DECIMAL(10,2) NOT NULL,
    dueno_id INT,
    empleado_id INT,
    tipo ENUM('petshop', 'alimentos', 'medicamentos', 'estetica', 'consulta', 'otros') NOT NULL,
    FOREIGN KEY (dueno_id) REFERENCES duenos(id) ON DELETE SET NULL,
    FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS historial_clinico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascota_id INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    veterinario_id INT,
    diagnostico TEXT,
    tratamiento TEXT,
    peso DECIMAL(5,2),
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE,
    FOREIGN KEY (veterinario_id) REFERENCES empleados(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS historial_estetica (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mascota_id INT NOT NULL,
    turno_id INT,
    peluquero_id INT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    servicios TEXT NOT NULL,
    productos_usados TEXT,
    precio DECIMAL(10,2) NOT NULL,
    duracion_minutos INT,
    notas TEXT,
    foto_antes VARCHAR(255),
    foto_despues VARCHAR(255),
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE,
    FOREIGN KEY (turno_id) REFERENCES turnos(id) ON DELETE SET NULL,
    FOREIGN KEY (peluquero_id) REFERENCES empleados(id) ON DELETE RESTRICT
);

-- 1. Dueños de la veterinaria 
INSERT INTO duenos_veterinaria (nombre, cuil, participacion_porcentaje) VALUES
('Luciana Fernández', '27-30123456-9', 60.00),
('Carlos Alberto Gómez', '20-20123456-0', 40.00);

-- 2. Empleados 
INSERT INTO empleados (nombre, usuario, password, rol) VALUES
('Laura Gómez', 'laura.vet', 'vet123', 'veterinario'),
('Carlos Méndez', 'carlos.vet', 'vet456', 'veterinario'),
('Mariana López', 'mariana.rec', 'rec789', 'recepcionista'),
('Pedro Fernández', 'pedro.rec', 'rec101', 'recepcionista'),
('Ana Torres', 'ana.pelu', 'pelu202', 'peluquero'),
('José Ramírez', 'jose.pelu', 'pelu303', 'peluquero'),
('Sofía Ruiz', 'sofia.admin', 'admin999', 'admin'),
('Juan Cruz', 'juan.vet', 'vet111', 'veterinario'),
('Lucía Herrera', 'lucia.rec', 'rec222', 'recepcionista'),
('Diego Morales', 'diego.pelu', 'pelu444', 'peluquero');

-- 3. Clientes / Dueños de mascotas 
INSERT INTO duenos (nombre, dni, telefono, email, direccion) VALUES
('Juan Pérez', '30123456', '3815551234', 'juanp@gmail.com', 'Av. Mate de Luna 456'),
('María González', '32145678', '3816667890', 'maria.g@gmail.com', 'San Martín 1234'),
('Carlos Rodríguez', '34156789', '3817774567', 'carlosr@yahoo.com.ar', '24 de Septiembre 890'),
('Ana Martínez', '29123456', '3814443210', 'ana.mtz@hotmail.com', 'Av. Sarmiento 567'),
('Pedro López', '35178901', '3818886543', 'pedrolopez@gmail.com', 'Independencia 234'),
('Laura Sánchez', '36189012', '3819998765', 'laurasanchez@outlook.com', 'Belgrano 789'),
('Diego Fernández', '37190123', '3812223456', 'diegof@gmail.com', 'Av. Alem 1011'),
('Sofía Torres', '38101234', '3813335678', 'sofia.torres@gmail.com', 'Rivadavia 1213'),
('José Ramírez', '39112345', '3814446789', 'joseram@gmail.com', 'Av. Roca 1415'),
('Valeria Herrera', '40123456', '3815557890', 'valeriah@yahoo.com.ar', 'San Juan 1617');

-- 4. Mascotas 
INSERT INTO mascotas (dueno_id, nombre, especie, raza, fecha_nacimiento, sexo, color) VALUES
(1, 'Firulais', 'perro', 'Labrador', '2019-05-10', 'macho', 'negro'),
(2, 'Michi', 'gato', 'Persa', '2020-03-15', 'hembra', 'blanco'),
(3, 'Rocky', 'perro', 'Bulldog Francés', '2022-01-07', 'macho', 'atigrado'),
(4, 'Bella', 'perro', 'Golden Retriever', '2018-11-30', 'hembra', 'dorado'),
(5, 'Tigre', 'gato', 'Siamés', '2021-06-18', 'macho', 'puntos oscuros'),
(6, 'Max', 'perro', 'Pastor Alemán', '2017-09-05', 'macho', 'negro y fuego'),
(7, 'Nieve', 'gato', 'Blanco', '2023-02-14', 'hembra', 'blanco'),
(8, 'Coco', 'perro', 'Caniche', '2020-04-20', 'macho', 'blanco'),
(9, 'Sombra', 'gato', 'Negro', '2019-07-12', 'macho', 'negro'),
(10, 'Princesa', 'perro', 'Yorkshire', '2022-10-03', 'hembra', 'gris y dorado');

-- 5. Turnos 
INSERT INTO turnos (mascota_id, dueno_id, empleado_id, fecha, tipo, estado, motivo) VALUES
(1, 1, 1, '2025-02-10 09:00:00', 'estetica', 'pendiente', 'Baño y corte completo'),
(2, 2, 5, '2025-02-11 10:30:00', 'estetica', 'confirmado', 'Corte de uñas y baño'),
(3, 3, 2, '2025-02-12 11:00:00', 'consulta', 'realizado', 'Control anual'),
(4, 4, 1, '2025-02-13 14:00:00', 'vacunacion', 'pendiente', 'Vacuna antirrábica'),
(5, 5, 3, '2025-02-14 15:30:00', 'estetica', 'cancelado', 'Grooming completo'),
(6, 6, 6, '2025-02-15 16:00:00', 'consulta', 'confirmado', 'Dolor de oído'),
(7, 7, 5, '2025-02-16 09:30:00', 'estetica', 'pendiente', 'Baño medicado'),
(8, 8, 4, '2025-02-17 10:00:00', 'control', 'realizado', 'Control de peso'),
(9, 9, 6, '2025-02-18 11:30:00', 'estetica', 'confirmado', 'Corte de pelo y baño'),
(10, 10, 1, '2025-02-19 14:00:00', 'urgencia', 'pendiente', 'Mordedura de otro perro');

-- 6. Estética 
INSERT INTO estetica (turno_id, tipo_servicio, precio, realizado, peluquero_id, notas) VALUES
(1, 'Baño + corte completo', 4500.00, 0, 5, 'Mascota tranquila'),
(2, 'Corte de uñas + baño', 3200.00, 1, 6, 'Buen comportamiento'),
(5, 'Grooming completo', 4800.00, 0, 5, 'Pendiente'),
(7, 'Baño medicado', 3800.00, 1, 6, 'Alergia leve'),
(9, 'Corte higiénico + baño', 4200.00, 1, 5, 'Todo bien'),
(1, 'Limpieza de oídos', 1500.00, 0, 6, 'Complementario'),
(2, 'Corte de pelo raza', 5000.00, 1, 5, 'Finalizado'),
(5, 'Baño antipulgas', 3500.00, 0, 6, 'Pendiente'),
(7, 'Corte completo', 4800.00, 1, 5, 'Mascota feliz'),
(9, 'Baño simple', 2800.00, 1, 6, 'Rápido');

-- 7. Productos 
INSERT INTO productos (nombre, categoria, precio_compra, precio_venta, stock, stock_minimo, proveedor, codigo_barras) VALUES
('Antipulgas Frontline', 'medicamentos', 3200.00, 4500.00, 35, 10, 'Bayer', '7501234567890'),
('Royal Canin Adulto 15kg', 'alimentos', 8500.00, 12000.00, 22, 5, 'Royal Canin', '9001234567891'),
('Collar reflectante M', 'petshop', 1200.00, 2500.00, 48, 8, 'Petit', '8009876543210'),
('Shampoo antipulgas 500ml', 'medicamentos', 1800.00, 3200.00, 60, 15, 'Beaphar', '7502345678901'),
('Pedigree Adulto 20kg', 'alimentos', 7000.00, 9500.00, 18, 5, 'Mars', '9002345678902'),
('Juguete mordedor Kong', 'petshop', 2500.00, 4800.00, 30, 5, 'Kong', '8008765432109'),
('Vacuna antirrábica', 'medicamentos', 800.00, 1500.00, 100, 20, 'Nobivac', '7503456789012'),
('Purina Pro Plan Cachorro', 'alimentos', 9000.00, 12500.00, 25, 8, 'Purina', '9003456789013'),
('Cama ortopédica L', 'petshop', 4500.00, 8500.00, 15, 3, 'PetComfort', '8007654321098'),
('Pipeta antiparasitaria', 'medicamentos', 2800.00, 4200.00, 40, 10, 'Zoetis', '7504567890123');

-- 8. Alimentos 
INSERT INTO alimentos (producto_id, tipo, etapa, sabor, peso, fecha_vencimiento) VALUES
(2, 'seco', 'adulto', 'pollo', 15.00, '2026-05-01'),
(5, 'seco', 'adulto', 'carne', 20.00, '2026-07-15'),
(8, 'seco', 'cachorro', 'pollo y arroz', 12.00, '2026-02-28');

-- 9. Medicamentos 
INSERT INTO medicamentos (producto_id, principio_activo, forma, dosis, fecha_vencimiento) VALUES
(1, 'Fipronil', 'pipeta', '1/mes', '2026-12-31'),
(4, 'Permetrina', 'shampoo', '1 aplicación', '2026-06-30'),
(7, 'Rabvac', 'inyectable', '1 ml', '2025-11-15');

-- 10. Ventas 
INSERT INTO ventas (fecha, total, dueno_id, empleado_id, tipo) VALUES
('2025-01-05 10:15:00', 4500.00, 1, 1, 'medicamentos'),
('2025-01-06 11:30:00', 12000.00, 2, 2, 'alimentos'),
('2025-01-07 14:00:00', 2500.00, 3, 4, 'petshop'),
('2025-01-08 09:45:00', 3200.00, 4, 5, 'estetica'),
('2025-01-09 16:20:00', 8500.00, 5, 3, 'alimentos'),
('2025-01-10 13:10:00', 4800.00, 6, 6, 'petshop'),
('2025-01-11 15:00:00', 1500.00, 7, 1, 'medicamentos'),
('2025-01-12 10:50:00', 12500.00, 8, 2, 'alimentos'),
('2025-01-13 12:30:00', 3500.00, 9, 4, 'petshop'),
('2025-01-14 17:00:00', 4200.00, 10, 8, 'medicamentos');

-- 11. Detalle de ventas 
INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES
(1, 1, 1, 4500.00, 4500.00),
(2, 2, 1, 12000.00, 12000.00),
(3, 3, 1, 2500.00, 2500.00),
(4, 4, 1, 3200.00, 3200.00),
(5, 5, 1, 9500.00, 9500.00),
(6, 6, 1, 4800.00, 4800.00),
(7, 7, 1, 1500.00, 1500.00),
(8, 8, 1, 12500.00, 12500.00),
(9, 9, 1, 3500.00, 3500.00),
(10, 10, 1, 4200.00, 4200.00);

-- 12. Historial clínico 
INSERT INTO historial_clinico (mascota_id, veterinario_id, diagnostico, tratamiento, peso) VALUES
(1, 1, 'Control anual', 'Vacunación', 32.50),
(2, 2, 'Otitis', 'Antibiótico', 4.80),
(3, 1, 'Desparasitación', 'Pastilla', 25.00);

-- 13. Historial de estética 
INSERT INTO historial_estetica (mascota_id, turno_id, peluquero_id, precio, duracion_minutos, servicios) VALUES
(1, 1, 3, 4500.00, 60, 'Baño + corte'),
(2, 2, 4, 3200.00, 45, 'Baño simple'),
(3, 1, 3, 4800.00, 70, 'Grooming completo');

