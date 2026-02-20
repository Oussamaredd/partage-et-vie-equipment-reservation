<?php

namespace App\Auth\Application\Login;

use App\Auth\Domain\Exception\InvalidCredentials;
use App\Auth\Domain\PasswordHasherInterface;
use App\Auth\Domain\UserRepositoryInterface;
use App\Auth\Infrastructure\Security\JwtTokenManager;
use InvalidArgumentException;

class LoginService
{
    public function __construct(
        private readonly JwtTokenManager $jwtTokenManager,
        private readonly UserRepositoryInterface $userRepository,
        private readonly PasswordHasherInterface $passwordHasher,
    ) {
    }

    public function handle(LoginInput $input): LoginResult
    {
        $email = strtolower(trim($input->email));
        if ($email === '' || trim($input->password) === '') {
            throw new InvalidArgumentException('Email and password are required.');
        }

        $user = $this->userRepository->findByEmail($email);
        if ($user === null || !$this->passwordHasher->verify($input->password, $user->getPasswordHash())) {
            throw new InvalidCredentials('Invalid credentials.');
        }

        return new LoginResult(
            $this->jwtTokenManager->createToken($user->getEmail()),
            $user->getEmail(),
        );
    }
}
