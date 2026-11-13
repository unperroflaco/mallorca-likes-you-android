<?php
require_once __DIR__ . '/common.php';

mly_auth();

$lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
$lng = filter_input(INPUT_GET, 'lng', FILTER_VALIDATE_FLOAT);
if ($lat === false || $lat === null || $lng === false || $lng === null ||
    $lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
    mly_json(array('ok' => false, 'error' => 'invalid_coordinates',
        'message' => 'Se requieren lat y lng válidos.'), 400);
}

$lang = mly_language((string)($_GET['idioma'] ?? 'es'));
list($shortField, $longField) = mly_description_fields($lang);

$rawCategories = $_GET['categorias'] ?? ($_GET['categoria'] ?? '');
if (!is_array($rawCategories)) $rawCategories = explode(',', (string)$rawCategories);
$categories = array_values(array_unique(array_filter(array_map('trim', $rawCategories))));
if (!$categories) {
    mly_json(array('ok' => false, 'error' => 'categories_required',
        'message' => 'Indica una o varias categorías.'), 400);
}

$rawSubcategories = $_GET['subcategorias'] ?? ($_GET['subcategoria'] ?? array());
if (!is_array($rawSubcategories)) $rawSubcategories = explode(',', (string)$rawSubcategories);
$subcategories = array_values(array_unique(array_filter(array_map('trim', $rawSubcategories))));

$limit = (int)($_GET['limite'] ?? 400);
if ($limit < 1) $limit = 1;
if ($limit > 400) $limit = 400;

$db = mly_db();
$categoryMarks = implode(',', array_fill(0, count($categories), '?'));
$distance = mly_distance_sql();

$sql = "SELECT id, categoria, lugar, {$shortField} AS desc_corta,
               {$longField} AS desc_larga, lat, lng, otros, municipio,
               imagen, imagen_autor, json, {$distance} AS distancia_km
        FROM tbmallorcabot
        WHERE categoria IN ({$categoryMarks})";

$types = 'ddd' . str_repeat('s', count($categories));
$params = array((float)$lat, (float)$lng, (float)$lat);
foreach ($categories as $category) $params[] = $category;

if ($subcategories && in_array('Imprescindibles', $categories, true)) {
    $parts = array();
    foreach ($subcategories as $sub) {
        $parts[] = "otros LIKE ?";
        $types .= 's';
        $params[] = '%' . $db->real_escape_string($sub) . '%';
    }
    $sql .= " AND (categoria <> 'Imprescindibles' OR (" . implode(' OR ', $parts) . "))";
}

$sql .= " ORDER BY distancia_km ASC LIMIT " . $limit;
$stmt = $db->prepare($sql);
if (!$stmt) {
    error_log('MLY buscar prepare error: ' . $db->error);
    mly_json(array('ok' => false, 'error' => 'query_failed'), 500);
}
$bind = array($types);
foreach ($params as $key => $value) $bind[] = &$params[$key];
call_user_func_array(array($stmt, 'bind_param'), $bind);

if (!$stmt->execute()) {
    error_log('MLY buscar execute error: ' . $stmt->error);
    mly_json(array('ok' => false, 'error' => 'query_failed'), 500);
}
$result = $stmt->get_result();
$items = array();
while ($row = $result->fetch_assoc()) {
    $items[] = array(
        'id' => (int)$row['id'],
        'categoria' => $row['categoria'],
        'lugar' => $row['lugar'],
        'desc_corta' => $row['desc_corta'],
        'lat' => (float)$row['lat'],
        'lng' => (float)$row['lng'],
        'municipio' => $row['municipio'],
        'otros' => $row['otros'],
        'distancia_km' => round((float)$row['distancia_km'], 2),
        'fotos' => mly_photos($row['imagen'], $row['imagen_autor'])
    );
}
$stmt->close();

mly_json(array(
    'ok' => true,
    'idioma' => $lang,
    'origen' => array('lat' => (float)$lat, 'lng' => (float)$lng),
    'total' => count($items),
    'resultados' => $items
));
