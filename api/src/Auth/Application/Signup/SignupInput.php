<?php

namespace App\Auth\Application\Signup;

class SignupInput
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
    ) {
    }
}
