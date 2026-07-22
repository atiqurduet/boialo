<?php
require_once __DIR__ . '/_helpers.php';

global $MEDIA_FOLDERS;

media_cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  media_json(405, ['error' => 'Method not allowed']);
}

$body = json_decode(file_get_contents('php://input'), true);
$folder    = $body['folder']    ?? '';
$filename  = $body['filename']  ?? '';
$year      = $body['year']      ?? '';
$month     = $body['month']     ?? '';
$timestamp = $body['timestamp'] ?? '';
$token     = $body['token']     ?? '';

if (!in_array($folder, $MEDIA_FOLDERS, true)) {
  media_json(400, ['error' => 'Invalid folder']);
}
if (!preg_match('/^[a-f0-9\-]{36}\.[a-z0-9]{2,5}$/i', $filename)) {
  media_json(400, ['error' => 'Invalid filename']);
}
if (!preg_match('/^\d{4}$/', $year) || !preg_match('/^\d{2}$/', $month)) {
  media_json(400, ['error' => 'Invalid date parts']);
}

if (!media_verify_token("$folder/$year/$month", $filename, $timestamp, $token)) {
  media_json(401, ['error' => 'Invalid or expired token']);
}

$base = rtrim(MEDIA_STORAGE_PATH, '/');
$path = "$base/$folder/$year/$month/$filename";
$thumb = "$base/$folder/$year/$month/thumb_$filename";

// Path safety: ensure resolved path is inside storage root
$realBase = realpath($base);
$realPath = realpath($path);
if ($realPath === false || strpos($realPath, $realBase) !== 0) {
  media_json(400, ['error' => 'Invalid path']);
}

@unlink($path);
@unlink($thumb);

media_json(200, ['ok' => true]);
