<?php

namespace App\Auth\Application\Security;

use InvalidArgumentException;

class PasswordPolicy
{
    public function assertValid(string $password): void
    {
        if (strlen($password) < 8) {
            throw new InvalidArgumentException('Password must be at least 8 characters long.');
        }

        if (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
            throw new InvalidArgumentException('Password must contain at least one letter and one number.');
        }
    }
}
