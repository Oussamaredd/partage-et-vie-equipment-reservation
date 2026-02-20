<?php

namespace App\Tests\Unit\Auth;

use App\Auth\Domain\PasswordResetToken;
use App\Auth\Domain\User;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class PasswordResetTokenLifecycleTest extends TestCase
{
    public function testTokenIsUsableThenNotUsableWhenUsed(): void
    {
        $user = User::create('token.user@company.test', 'hash');
        $token = PasswordResetToken::create($user, hash('sha256', 'raw-token'), new DateTimeImmutable('+1 hour'));

        self::assertTrue($token->isUsableAt(new DateTimeImmutable()));

        $token->markAsUsed(new DateTimeImmutable());

        self::assertFalse($token->isUsableAt(new DateTimeImmutable()));
    }
}
