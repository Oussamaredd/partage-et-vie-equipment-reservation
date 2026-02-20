<?php

namespace App\Auth\Application\PasswordReset;

use App\Auth\Application\Security\PasswordPolicy;
use App\Auth\Domain\Exception\ExpiredResetToken;
use App\Auth\Domain\Exception\InvalidResetToken;
use App\Auth\Domain\PasswordHasherInterface;
use App\Auth\Domain\PasswordResetTokenRepositoryInterface;
use DateTimeImmutable;
use InvalidArgumentException;

class ResetPasswordService
{
    public function __construct(
        private readonly PasswordResetTokenRepositoryInterface $passwordResetTokenRepository,
        private readonly PasswordHasherInterface $passwordHasher,
        private readonly PasswordPolicy $passwordPolicy,
    ) {
    }

    public function handle(ResetPasswordInput $input): void
    {
        $rawToken = trim($input->token);
        if ($rawToken === '') {
            throw new InvalidArgumentException('Reset token is required.');
        }

        $this->passwordPolicy->assertValid($input->newPassword);

        $token = $this->passwordResetTokenRepository->findByTokenHash(hash('sha256', $rawToken));
        if ($token === null) {
            throw new InvalidResetToken('Reset token is invalid.');
        }

        $now = new DateTimeImmutable();
        if (!$token->isUsableAt($now)) {
            throw new ExpiredResetToken('Reset token is expired or already used.');
        }

        $user = $token->getUser();
        $user->updatePasswordHash($this->passwordHasher->hash($input->newPassword));
        $token->markAsUsed($now);

        $this->passwordResetTokenRepository->save($token);
    }
}
