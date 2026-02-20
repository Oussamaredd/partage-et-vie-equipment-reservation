<?php

namespace App\Auth\Application\PasswordReset;

class RequestPasswordResetResult
{
    public function __construct(
        public readonly string $message,
        public readonly ?string $token,
    ) {
    }
}
