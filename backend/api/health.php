<?php
require_once __DIR__ . '/../respuesta.php';
require_once __DIR__ . '/../conexion.php';

$db = mly_db();
mly_json(array(
    'ok' => true,
    'api' => 'online',
    'database' => $db ? 'connected' : 'not_configured'
));
