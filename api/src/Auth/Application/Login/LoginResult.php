<?php

namespace App\Auth\Application\Login;

class LoginResult
{
    public function __construct(
        public readonly string $token,
        public readonly string $email,
    ) {
    }
}
