<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when the AI service (FastAPI) is unreachable or returns an error.
 * Rendered as 503 by the API exception handler.
 */
class AiUnavailableException extends Exception {}
