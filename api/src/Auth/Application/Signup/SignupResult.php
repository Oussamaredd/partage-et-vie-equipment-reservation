<?php

namespace App\Auth\Application\Signup;

class SignupResult
{
    public function __construct(
        public readonly int $id,
        public readonly string $email,
        public readonly string $message,
    ) {
    }
}
