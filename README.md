# Mallorca Likes You

Aplicación Android multiusuario para descubrir Mallorca. La fuente de datos de lugares es la tabla MySQL/MariaDB **existente** `tbmallorcabot`, con sus aproximadamente 400 registros. El proyecto no crea una segunda tabla de lugares ni duplica el catálogo.

## Estructura

- `app/`: aplicación Android Kotlin con interfaz HTML/CSS/JavaScript en WebView.
- `app/src/main/assets/www/`: interfaz, selección de ubicación y cliente de la API.
- `backend/api/`: webservice PHP 8 para consultar `tbmallorcabot`.
- `backend/API_README.md`: parámetros, autenticación y ejemplos de los endpoints.
- `.github/workflows/android.yml`: compilación automática del APK.

## Webservice PHP

El servicio recibe coordenadas, idioma y una o varias categorías; para `Imprescindibles` permite filtrar por subcategorías almacenadas en el campo `otros`. Devuelve resultados ordenados por distancia y permite consultar la ficha completa de cada lugar.

Endpoints:
- `GET api/categorias.php`
- `GET api/buscar.php`
- `GET api/detalle.php`

Las imágenes se leen desde el JSON de la columna `imagen`. La documentación completa está en `backend/API_README.md`.

## Configuración del servidor

1. Publica la carpeta `backend/` en el alojamiento PHP 8.
2. Copia `backend/config.example.php` a `backend/config.php`.
3. Introduce las credenciales de la base de datos que contiene `tbmallorcabot` y configura un token largo.
4. En `app/src/main/assets/www/config.js`, configura la URL pública de `backend/api/` y el mismo token.
5. No subas `config.php` ni credenciales al repositorio.

No hay que ejecutar un esquema SQL para crear otra tabla de lugares: el servicio consulta directamente `tbmallorcabot`.

## Compilar el APK

Abre **Actions** en GitHub y descarga el artefacto `mallorca-likes-you-debug-apk` cuando finalice la compilación. El APK actual es de depuración. Antes de distribuir una versión de producción hay que configurar la firma permanente para que las actualizaciones conserven las instalaciones existentes.

## Pendiente

La API de lugares está conectada en el código, pero necesita que se configure el acceso al servidor y se pruebe con la base de datos real. La meteorología y el aviso legal siguen pendientes. El token integrado en una APK es extraíble y constituye una protección básica, no una credencial secreta individual.
