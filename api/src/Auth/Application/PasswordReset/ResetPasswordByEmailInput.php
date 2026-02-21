<?php

namespace App\Auth\Application\PasswordReset;

class ResetPasswordByEmailInput
{
    public function __construct(
        public readonly string $email,
        public readonly string $newPassword,
    ) {
    }
}
