<?php

namespace App\Auth\Infrastructure\Security;

use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use InvalidArgumentException;

class JwtTokenManager
{
    public function __construct(
        private readonly string $jwtSecret,
        private readonly int $jwtTtl,
    ) {
    }

    public function createToken(string $email): string
    {
        $now = time();

        return JWT::encode([
            'sub' => $email,
            'iat' => $now,
            'exp' => $now + $this->jwtTtl,
        ], $this->jwtSecret, 'HS256');
    }

    public function getEmailFromToken(string $token): string
    {
        if ($token === '') {
            throw new InvalidArgumentException('Missing bearer token.');
        }

        try {
            $decoded = JWT::decode($token, new Key($this->jwtSecret, 'HS256'));
        } catch (ExpiredException) {
            throw new InvalidArgumentException('Token expired.');
        } catch (\Throwable) {
            throw new InvalidArgumentException('Invalid token.');
        }

        if (!isset($decoded->sub) || !is_string($decoded->sub) || trim($decoded->sub) === '') {
            throw new InvalidArgumentException('Invalid token payload.');
        }

        return $decoded->sub;
    }
}
