<?php
declare(strict_types=1);

function mly_db()
{
    static $connection = null;
    if ($connection !== null) {
        return $connection;
    }

    $configFile = __DIR__ . '/config.php';
    if (!file_exists($configFile)) {
        return null;
    }

    $config = require $configFile;
    mysqli_report(MYSQLI_REPORT_OFF);
    $connection = new mysqli(
        $config['db_host'],
        $config['db_user'],
        $config['db_pass'],
        $config['db_name']
    );

    if ($connection->connect_errno) {
        $connection = null;
        return null;
    }

    $connection->set_charset('utf8mb4');
    return $connection;
}
