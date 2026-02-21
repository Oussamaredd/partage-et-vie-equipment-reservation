<?php

namespace App\Auth\Application\PasswordReset;

use App\Auth\Application\Security\PasswordPolicy;
use App\Auth\Domain\PasswordHasherInterface;
use App\Auth\Domain\UserRepositoryInterface;
use InvalidArgumentException;

class ResetPasswordByEmailService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly PasswordHasherInterface $passwordHasher,
        private readonly PasswordPolicy $passwordPolicy,
    ) {
    }

    public function handle(ResetPasswordByEmailInput $input): void
    {
        $email = strtolower(trim($input->email));
        if ($email === '') {
            throw new InvalidArgumentException('Email is required.');
        }

        $user = $this->userRepository->findByEmail($email);
        if ($user === null) {
            throw new InvalidArgumentException('Account not found for this email.');
        }

        $this->passwordPolicy->assertValid($input->newPassword);
        $user->updatePasswordHash($this->passwordHasher->hash($input->newPassword));

        $this->userRepository->save($user);
    }
}
