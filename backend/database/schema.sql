CREATE TABLE IF NOT EXISTS mly_categoria (
    id_categoria INT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    icono VARCHAR(20) DEFAULT NULL,
    orden INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id_categoria),
    UNIQUE KEY uq_mly_categoria_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mly_lugar (
    id_lugar BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    id_categoria INT UNSIGNED NOT NULL,
    nombre VARCHAR(180) NOT NULL,
    descripcion TEXT DEFAULT NULL,
    latitud DECIMAL(10,7) NOT NULL,
    longitud DECIMAL(10,7) NOT NULL,
    direccion VARCHAR(255) DEFAULT NULL,
    url_foto VARCHAR(500) DEFAULT NULL,
    autor_foto VARCHAR(180) DEFAULT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_alta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_lugar),
    KEY ix_mly_lugar_categoria (id_categoria),
    KEY ix_mly_lugar_coordenadas (latitud, longitud),
    CONSTRAINT fk_mly_lugar_categoria
        FOREIGN KEY (id_categoria) REFERENCES mly_categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO mly_categoria (codigo, nombre, icono, orden) VALUES
('playas', 'Playas', '🏖️', 1),
('mercadillos', 'Mercadillos', '🧺', 2),
('pueblos', 'Pueblos', '🏘️', 3),
('lugares', 'Lugares', '📍', 4),
('imprescindibles', 'Imprescindibles', '⭐', 5);
