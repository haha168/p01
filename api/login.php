<?php
/**
 * 編班查詢 — 登入 API（可選）
 * 當環境具備 PHP 時，前端可改呼叫此端點進行驗證。
 * 目前獨立演示頁預設使用前端讀取 data/students.json。
 *
 * 請求：POST JSON { "id": "A123456789", "password": "demo1234" }
 * 成功：{ "ok": true, "student": { name, className, advisor, grade, studentNo } }
 * 失敗：{ "ok": false, "message": "..." }
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

/** 僅允許 POST */
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'message' => '僅支援 POST 方法'], JSON_UNESCAPED_UNICODE);
    exit;
}

/** 讀取 JSON 請求內容 */
$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => '請求格式錯誤'], JSON_UNESCAPED_UNICODE);
    exit;
}

$id = strtoupper(trim((string)($payload['id'] ?? '')));
$password = (string)($payload['password'] ?? '');

if ($id === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'message' => '請輸入身分證字號與密碼'], JSON_UNESCAPED_UNICODE);
    exit;
}

/** 載入學生資料 */
$dataFile = dirname(__DIR__) . '/data/students.json';
if (!is_readable($dataFile)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'message' => '無法讀取學生資料'], JSON_UNESCAPED_UNICODE);
    exit;
}

$json = json_decode(file_get_contents($dataFile), true);
$students = $json['students'] ?? [];

$matched = null;
foreach ($students as $student) {
    if (strtoupper((string)$student['id']) === $id && (string)$student['password'] === $password) {
        $matched = $student;
        break;
    }
}

if ($matched === null) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'message' => '身分證字號或密碼不正確'], JSON_UNESCAPED_UNICODE);
    exit;
}

/** 成功回應：不回傳密碼 */
echo json_encode([
    'ok' => true,
    'student' => [
        'id' => $matched['id'],
        'name' => $matched['name'],
        'className' => $matched['className'],
        'advisor' => $matched['advisor'],
        'grade' => $matched['grade'],
        'studentNo' => $matched['studentNo'],
    ],
], JSON_UNESCAPED_UNICODE);
