<?php
require_once __DIR__ . '/common.php';

mly_auth();
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    mly_json(array('ok' => false, 'error' => 'invalid_id'), 400);
}
$lang = mly_language((string)($_GET['idioma'] ?? 'es'));
list($shortField, $longField) = mly_description_fields($lang);

$db = mly_db();
$sql = "SELECT id, categoria, lugar, {$shortField} AS desc_corta,
               {$longField} AS desc_larga, lat, lng, otros, municipio,
               imagen, imagen_autor, json
        FROM tbmallorcabot WHERE id = ? LIMIT 1";
$stmt = $db->prepare($sql);
if (!$stmt) mly_json(array('ok' => false, 'error' => 'query_failed'), 500);
$stmt->bind_param('i', $id);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) mly_json(array('ok' => false, 'error' => 'not_found'), 404);

mly_json(array(
    'ok' => true,
    'idioma' => $lang,
    'lugar' => array(
        'id' => (int)$row['id'],
        'categoria' => $row['categoria'],
        'lugar' => $row['lugar'],
        'desc_corta' => $row['desc_corta'],
        'desc_larga' => $row['desc_larga'],
        'lat' => (float)$row['lat'],
        'lng' => (float)$row['lng'],
        'municipio' => $row['municipio'],
        'otros' => $row['otros'],
        'fotos' => mly_photos($row['imagen'], $row['imagen_autor']),
        'json' => $row['json']
    )
));
