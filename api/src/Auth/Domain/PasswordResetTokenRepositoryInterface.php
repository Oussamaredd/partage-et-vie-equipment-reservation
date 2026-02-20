<?php

namespace App\Auth\Domain;

interface PasswordResetTokenRepositoryInterface
{
    public function findByTokenHash(string $tokenHash): ?PasswordResetToken;

    public function save(PasswordResetToken $token): void;
}
