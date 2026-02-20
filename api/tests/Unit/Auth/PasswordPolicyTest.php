<?php

namespace App\Tests\Unit\Auth;

use App\Auth\Application\Security\PasswordPolicy;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class PasswordPolicyTest extends TestCase
{
    public function testRejectsShortPassword(): void
    {
        $policy = new PasswordPolicy();

        $this->expectException(InvalidArgumentException::class);
        $policy->assertValid('Abc123');
    }

    public function testAcceptsValidPassword(): void
    {
        $policy = new PasswordPolicy();
        $policy->assertValid('Abcdef12');

        self::assertTrue(true);
    }
}
