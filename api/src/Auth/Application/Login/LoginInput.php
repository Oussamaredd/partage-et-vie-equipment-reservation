<?php

namespace App\Auth\Application\Login;

class LoginInput
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
    ) {
    }
}
