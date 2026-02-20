<?php

namespace App\Auth\Application\PasswordReset;

use App\Auth\Domain\PasswordResetToken;
use App\Auth\Domain\PasswordResetTokenRepositoryInterface;
use App\Auth\Domain\UserRepositoryInterface;
use DateInterval;
use DateTimeImmutable;

class RequestPasswordResetService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly PasswordResetTokenRepositoryInterface $passwordResetTokenRepository,
        private readonly bool $exposeResetToken,
        private readonly int $resetTokenTtl,
    ) {
    }

    public function handle(RequestPasswordResetInput $input): RequestPasswordResetResult
    {
        $email = strtolower(trim($input->email));
        $genericMessage = 'If your account exists, a password reset link has been generated.';
        if ($email === '') {
            return new RequestPasswordResetResult($genericMessage, null);
        }

        $user = $this->userRepository->findByEmail($email);
        if ($user === null) {
            return new RequestPasswordResetResult($genericMessage, null);
        }

        $rawToken = bin2hex(random_bytes(32));
        $token = PasswordResetToken::create(
            $user,
            hash('sha256', $rawToken),
            (new DateTimeImmutable())->add(new DateInterval(sprintf('PT%dS', $this->resetTokenTtl)))
        );
        $this->passwordResetTokenRepository->save($token);

        return new RequestPasswordResetResult(
            $genericMessage,
            $this->exposeResetToken ? $rawToken : null,
        );
    }
}
