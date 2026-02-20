<?php

namespace App\Auth\Application\Signup;

use App\Auth\Application\Security\PasswordPolicy;
use App\Auth\Domain\Exception\AuthConflict;
use App\Auth\Domain\PasswordHasherInterface;
use App\Auth\Domain\User;
use App\Auth\Domain\UserRepositoryInterface;
use InvalidArgumentException;

class SignupService
{
    public function __construct(
        private readonly UserRepositoryInterface $userRepository,
        private readonly PasswordHasherInterface $passwordHasher,
        private readonly PasswordPolicy $passwordPolicy,
    ) {
    }

    public function handle(SignupInput $input): SignupResult
    {
        $email = strtolower(trim($input->email));
        if ($email === '') {
            throw new InvalidArgumentException('Email is required.');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('Email format is invalid.');
        }

        $this->passwordPolicy->assertValid($input->password);

        if ($this->userRepository->findByEmail($email) !== null) {
            throw new AuthConflict('Email is already registered.');
        }

        $user = User::create($email, $this->passwordHasher->hash($input->password));
        $this->userRepository->save($user);

        return new SignupResult(
            $user->getId() ?? 0,
            $user->getEmail(),
            'Signup completed successfully.',
        );
    }
}
