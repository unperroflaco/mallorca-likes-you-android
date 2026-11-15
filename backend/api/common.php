<?php
declare(strict_types=1);

require_once __DIR__ . '/../respuesta.php';

// La aplicación se ejecuta dentro de un WebView con origen file:// (Origin: null).
// Se permite CORS sin cookies; la autenticación sigue exigiendo el token Bearer.
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, Content-Type, Accept');
header('Access-Control-Max-Age: 86400');
header('Vary: Origin');

// El navegador envía OPTIONS antes del GET porque Authorization es una cabecera no simple.
// Debe responderse antes de comprobar el token.
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function mly_config(): array
{
    static $config = null;
    if ($config === null) {
        $file = dirname(__DIR__) . '/config.php';
        if (!is_file($file)) {
            mly_json(array('ok' => false, 'error' => 'server_not_configured'), 503);
        }
        $config = require $file;
    }
    return $config;
}

function mly_db(): mysqli
{
    static $db = null;
    if ($db instanceof mysqli) return $db;
    $c = mly_config();
    mysqli_report(MYSQLI_REPORT_OFF);
    $db = new mysqli($c['db_host'], $c['db_user'], $c['db_pass'], $c['db_name']);
    if ($db->connect_errno) {
        error_log('Mallorca Likes You DB connection failed: ' . $db->connect_error);
        mly_json(array('ok' => false, 'error' => 'database_unavailable'), 503);
    }
    $db->set_charset('utf8mb4');
    return $db;
}

function mly_auth(): void
{
    $c = mly_config();
    $expected = (string)($c['api_token'] ?? '');
    $provided = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = trim($_SERVER['HTTP_AUTHORIZATION']);
        if (preg_match('/^Bearer\\s+(.+)$/i', $header, $m)) $provided = trim($m[1]);
    }
    if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
        mly_json(array('ok' => false, 'error' => 'unauthorized'), 401);
    }
}

function mly_language(string $language): string
{
    $language = strtolower(trim($language));
    return in_array($language, array('es', 'ib', 'en', 'de'), true) ? $language : 'es';
}

function mly_description_fields(string $language): array
{
    $language = mly_language($language);
    if ($language === 'ib') return array('desc_corta_ib', 'desc_larga_ib');
    if ($language === 'en') return array('desc_corta_en', 'desc_larga_en');
    if ($language === 'de') return array('desc_corta_de', 'desc_larga_de');
    return array('desc_corta', 'desc_larga');
}

function mly_photos(?string $raw, ?string $defaultAuthor): array
{
    $base = 'https://mallorca.likesyou.org/img/';
    if ($raw === null || trim($raw) === '') return array();
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) return array();
    $items = $decoded['fotos'] ?? array();
    if (!is_array($items)) return array();

    $photos = array();
    foreach ($items as $item) {
        if (!is_array($item) || empty($item['nombre'])) continue;
        $name = trim((string)$item['nombre']);
        $author = trim((string)($item['autor'] ?? ''));
        if ($author === '') $author = trim((string)$defaultAuthor);
        if ($author === '') $author = 'Paco Gómez 2025';
        $photos[] = array(
            'nombre' => $name,
            'url' => preg_match('/^https?:\\/\\//i', $name) ? $name : $base . ltrim($name, '/'),
            'autor' => $author
        );
    }
    return $photos;
}

function mly_distance_sql(): string
{
    return '(6371 * ACOS(LEAST(1, GREATEST(-1, COS(RADIANS(?)) * COS(RADIANS(lat)) * COS(RADIANS(lng) - RADIANS(?)) + SIN(RADIANS(?)) * SIN(RADIANS(lat))))))';
}
