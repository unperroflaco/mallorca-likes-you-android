<?php
require_once __DIR__ . '/../respuesta.php';

$categories = array(
    array('id' => 'playas', 'name' => 'Playas', 'icon' => '🏖️'),
    array('id' => 'mercadillos', 'name' => 'Mercadillos', 'icon' => '🧺'),
    array('id' => 'pueblos', 'name' => 'Pueblos', 'icon' => '🏘️'),
    array('id' => 'lugares', 'name' => 'Lugares', 'icon' => '📍'),
    array('id' => 'imprescindibles', 'name' => 'Imprescindibles', 'icon' => '⭐')
);

mly_json(array('ok' => true, 'data' => $categories));
