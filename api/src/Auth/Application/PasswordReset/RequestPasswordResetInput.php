<?php

namespace App\Auth\Application\PasswordReset;

class RequestPasswordResetInput
{
    public function __construct(public readonly string $email)
    {
    }
}
