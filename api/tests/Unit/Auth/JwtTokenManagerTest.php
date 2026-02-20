<?php

namespace App\Tests\Unit\Auth;

use App\Auth\Infrastructure\Security\JwtTokenManager;
use PHPUnit\Framework\TestCase;

class JwtTokenManagerTest extends TestCase
{
    public function testEncodeDecode(): void
    {
        $manager = new JwtTokenManager('a-very-long-secret-key-for-tests-1234567890', 3600);

        $token = $manager->createToken('user@example.test');

        self::assertSame('user@example.test', $manager->getEmailFromToken($token));
    }
}
