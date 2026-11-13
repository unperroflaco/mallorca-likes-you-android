# API PHP de Mallorca Likes You

El servicio consulta la tabla existente `tbmallorcabot`. **No crea ni necesita una tabla alternativa de lugares**. La tabla debe contener los aproximadamente 400 registros ya cargados y los campos indicados en el diseño original.

## Configuración

1. Copiar `backend/config.example.php` a `backend/config.php` en el alojamiento.
2. Completar las credenciales de MySQL/MariaDB.
3. Establecer un token largo y aleatorio en `api_token`.
4. Configurar el mismo token y la URL pública de la API en `app/src/main/assets/www/config.js`.
5. Publicar el contenido de `backend/` en el servidor, conservando la ruta `api/`.

El archivo real `config.php` no debe subirse a GitHub.

## Autenticación

Todas las operaciones de catálogo requieren la cabecera:

```
Authorization: Bearer TU_TOKEN
```

## Endpoints

### GET categorias.php

Devuelve las categorías que realmente existen en `tbmallorcabot` y las subcategorías acordadas para `Imprescindibles`.

### GET buscar.php

Parámetros:

- `lat`: latitud del punto de origen (obligatorio).
- `lng`: longitud del punto de origen (obligatorio).
- `idioma`: `es`, `ib`, `en` o `de`.
- `categorias`: una o varias categorías, separadas por coma. También se acepta el parámetro repetido.
- `subcategorias`: una o varias subcategorías de Imprescindibles, separadas por coma.
- `limite`: máximo de resultados; por defecto 400 y máximo 400.

Ejemplo:

```
GET /api/buscar.php?lat=39.6953&lng=3.0176&idioma=es&categorias=Playa,Pueblo
```

Los resultados se ordenan por distancia al origen. Las descripciones cortas se seleccionan según el idioma solicitado. Si se selecciona Imprescindibles y se indican subcategorías, el filtro se aplica sobre el campo `otros`.

### GET detalle.php

Parámetros: `id` e `idioma`.

Devuelve descripción larga, coordenadas, municipio, campo `otros`, fotos y el contenido de `json`.

## Fotografías

El campo `imagen` se interpreta como JSON con estructura `{"fotos":[{"nombre":"archivo.jpg","autor":"Autor"}]}`. La URL se construye con la base `https://mallorca.likesyou.org/img/`, salvo que `nombre` ya sea una URL absoluta. Si el autor de una foto no viene informado, se usa `imagen_autor`; si tampoco existe, se muestra `Paco Gómez 2025`.

## Importante sobre el token

La APK distribuida a varias personas contiene el token de cliente y, por tanto, alguien con conocimientos podría extraerlo. Sirve como control básico para separar llamadas autorizadas de llamadas anónimas, pero no es una credencial secreta por usuario. Antes de una publicación amplia conviene añadir límites de peticiones y monitorización en el servidor.
