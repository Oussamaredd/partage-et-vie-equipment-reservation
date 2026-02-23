<?php

namespace App\Tests\Unit\Auth;

use App\Auth\Infrastructure\Security\JwtTokenManager;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class JwtTokenManagerTest extends TestCase
{
    public function testEncodeDecode(): void
    {
        $manager = new JwtTokenManager('a-very-long-secret-key-for-tests-1234567890', 3600);

        $token = $manager->createToken('user@example.test');

        self::assertSame('user@example.test', $manager->getEmailFromToken($token));
    }

    public function testRejectsMissingToken(): void
    {
        $manager = new JwtTokenManager('a-very-long-secret-key-for-tests-1234567890', 3600);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing bearer token.');

        $manager->getEmailFromToken('');
    }

    public function testRejectsInvalidToken(): void
    {
        $manager = new JwtTokenManager('a-very-long-secret-key-for-tests-1234567890', 3600);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid token.');

        $manager->getEmailFromToken('not-a-jwt');
    }

    public function testRejectsExpiredToken(): void
    {
        $manager = new JwtTokenManager('a-very-long-secret-key-for-tests-1234567890', -10);
        $token = $manager->createToken('user@example.test');

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Token expired.');

        $manager->getEmailFromToken($token);
    }
}
