<?php

namespace App\Auth\Application\PasswordReset;

class ResetPasswordInput
{
    public function __construct(
        public readonly string $token,
        public readonly string $newPassword,
    ) {
    }
}
