<?php
/**
 * Hacker Mystery 95 - Guestbook API
 *
 * Place this file at: https://hackermystery95.wosa.link/app/server/guestbook.php
 * Make sure data/guestbook.csv is writable by the web server
 */

// Allow CORS for game access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: text/plain; charset=utf-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

// Configuration
$csvFile = __DIR__ . '/data/guestbook.csv';
$badWordsUrl = 'https://raw.githubusercontent.com/dsojevic/profanity-list/refs/heads/main/en.txt';
$badWordsCacheFile = __DIR__ . '/badwords_cache.txt';
$badWordsCacheTime = 86400; // Cache for 24 hours
$maxMessageLength = 200;
$maxEntries = 100; // Keep only last 100 entries

// Get and validate input
$username = isset($_POST['username']) ? trim($_POST['username']) : 'guest';
$message = isset($_POST['message']) ? trim($_POST['message']) : '';

if (empty($message)) {
    http_response_code(400);
    echo 'Message required';
    exit;
}

// Sanitize username (alphanumeric only, max 20 chars)
$username = preg_replace('/[^a-zA-Z0-9_]/', '', $username);
if (empty($username)) {
    $username = 'guest';
}
$username = substr($username, 0, 20);

// Truncate message
$message = substr($message, 0, $maxMessageLength);

// Load bad words list (with caching)
function loadBadWords($url, $cacheFile, $cacheTime) {
    $badWords = array();

    // Check cache
    if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTime) {
        $content = file_get_contents($cacheFile);
    } else {
        // Fetch fresh list
        $content = @file_get_contents($url);
        if ($content !== false) {
            file_put_contents($cacheFile, $content);
        } elseif (file_exists($cacheFile)) {
            // Use stale cache if fetch fails
            $content = file_get_contents($cacheFile);
        }
    }

    if ($content) {
        $lines = explode("\n", $content);
        foreach ($lines as $line) {
            $word = strtolower(trim($line));
            if (!empty($word)) {
                $badWords[] = $word;
            }
        }
    }

    return $badWords;
}

// Check for profanity
function containsProfanity($text, $badWords) {
    $lowerText = strtolower($text);

    foreach ($badWords as $word) {
        if (strpos($lowerText, $word) !== false) {
            return true;
        }
    }

    return false;
}

// Load bad words and check
$badWords = loadBadWords($badWordsUrl, $badWordsCacheFile, $badWordsCacheTime);

if (containsProfanity($message, $badWords) || containsProfanity($username, $badWords)) {
    http_response_code(400);
    echo 'Inappropriate content';
    exit;
}

// Prepare CSV entry
$date = date('Y-m-d H:i:s');

// Escape for CSV (handle commas and quotes in message)
function escapeCSV($str) {
    // If contains comma, quote, or newline, wrap in quotes and escape quotes
    if (strpos($str, ',') !== false || strpos($str, '"') !== false || strpos($str, "\n") !== false) {
        return '"' . str_replace('"', '""', $str) . '"';
    }
    return $str;
}

$csvLine = $date . ',' . escapeCSV($username) . ',' . escapeCSV($message) . "\n";

// Read existing entries
$entries = array();
if (file_exists($csvFile)) {
    $entries = file($csvFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
}

// Add new entry
$entries[] = trim($csvLine);

// Keep only last N entries
if (count($entries) > $maxEntries) {
    $entries = array_slice($entries, -$maxEntries);
}

// Write back
if (file_put_contents($csvFile, implode("\n", $entries) . "\n") !== false) {
    http_response_code(200);
    echo 'OK';
} else {
    http_response_code(500);
    echo 'Failed to save';
}
?>
