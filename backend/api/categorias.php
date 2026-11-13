<?php
require_once __DIR__ . '/common.php';

mly_auth();
$db = mly_db();

$result = $db->query("SELECT DISTINCT categoria FROM tbmallorcabot WHERE categoria <> '' ORDER BY categoria");
if (!$result) mly_json(array('ok' => false, 'error' => 'query_failed'), 500);

$categories = array();
while ($row = $result->fetch_assoc()) {
    $categories[] = $row['categoria'];
}

$subcategories = array(
    'Puesta de sol',
    'Amanecer',
    'Pa amb oli',
    'Platos típicos',
    'Copa',
    'Niños',
    'Hoteles',
    'Experiencias',
    'Restaurantes',
    'Horno/panadería'
);

mly_json(array(
    'ok' => true,
    'categorias' => $categories,
    'subcategorias_imprescindibles' => $subcategories
));
