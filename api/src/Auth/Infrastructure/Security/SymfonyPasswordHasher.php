<?php

namespace App\Auth\Infrastructure\Security;

use App\Auth\Domain\PasswordHasherInterface;

class SymfonyPasswordHasher implements PasswordHasherInterface
{
    public function hash(string $plainPassword): string
    {
        return password_hash($plainPassword, PASSWORD_ARGON2ID);
    }

    public function verify(string $plainPassword, string $passwordHash): bool
    {
        return password_verify($plainPassword, $passwordHash);
    }
}
