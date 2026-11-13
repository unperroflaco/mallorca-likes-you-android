<?php
require_once __DIR__ . '/../respuesta.php';
mly_json(array(
    'ok' => true,
    'application' => 'Mallorca Likes You API',
    'api_version' => '1.0.0',
    'message' => 'API inicial disponible'
));
