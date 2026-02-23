<?php

namespace App\Tests\Unit\Auth;

use App\Auth\Infrastructure\Security\AuthenticatedUserResolver;
use App\Auth\Infrastructure\Security\JwtTokenManager;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Request;

class AuthenticatedUserResolverTest extends TestCase
{
    public function testResolveEmailFromAuthenticatedAttribute(): void
    {
        $jwt = $this->createMock(JwtTokenManager::class);
        $resolver = new AuthenticatedUserResolver($jwt);

        $request = new Request();
        $request->attributes->set('authenticated_email', 'employee@company.test');

        self::assertSame('employee@company.test', $resolver->resolveEmail($request));
    }

    public function testResolveEmailFromBearerTokenWhenAttributeMissing(): void
    {
        $jwt = $this->createMock(JwtTokenManager::class);
        $jwt->expects(self::once())
            ->method('getEmailFromToken')
            ->with('valid-token')
            ->willReturn('employee@company.test');

        $resolver = new AuthenticatedUserResolver($jwt);

        $request = new Request();
        $request->headers->set('Authorization', 'Bearer valid-token');

        self::assertSame('employee@company.test', $resolver->resolveEmail($request));
    }

    public function testResolveEmailRejectsMissingBearerHeader(): void
    {
        $jwt = $this->createMock(JwtTokenManager::class);
        $resolver = new AuthenticatedUserResolver($jwt);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Missing bearer token.');

        $resolver->resolveEmail(new Request());
    }
}
