<?php
require_once __DIR__ . '/config.php';

function media_cors() {
  $origins = array_map('trim', explode(',', MEDIA_ALLOWED_ORIGINS));
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array('*', $origins, true)) {
    header('Access-Control-Allow-Origin: *');
  } elseif ($origin && in_array($origin, $origins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
  }
  header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type, X-Media-Token, X-Media-Timestamp, X-Media-Folder, X-Media-Filename');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}

function media_json($status, $data) {
  http_response_code($status);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function media_verify_token($folder, $filename, $timestamp, $token) {
  if (!$folder || !$filename || !$timestamp || !$token) return false;
  if (abs(time() - (int)$timestamp) > MEDIA_TOKEN_TTL) return false;
  $payload = $folder . '|' . $filename . '|' . $timestamp;
  $expected = hash_hmac('sha256', $payload, MEDIA_HMAC_SECRET);
  return hash_equals($expected, $token);
}

function media_uuid() {
  $data = random_bytes(16);
  $data[6] = chr(ord($data[6]) & 0x0f | 0x40);
  $data[8] = chr(ord($data[8]) & 0x3f | 0x80);
  return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}
