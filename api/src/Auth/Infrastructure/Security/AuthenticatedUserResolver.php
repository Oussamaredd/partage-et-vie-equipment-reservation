<?php

namespace App\Auth\Infrastructure\Security;

use InvalidArgumentException;
use Symfony\Component\HttpFoundation\Request;

class AuthenticatedUserResolver
{
    public function __construct(private readonly JwtTokenManager $jwtTokenManager)
    {
    }

    public function resolveEmail(Request $request): string
    {
        $email = $request->attributes->get('authenticated_email');
        if (is_string($email) && trim($email) !== '') {
            return $email;
        }

        $header = (string) $request->headers->get('Authorization', '');
        if (!str_starts_with($header, 'Bearer ')) {
            throw new InvalidArgumentException('Missing bearer token.');
        }

        $token = trim(substr($header, 7));

        return $this->jwtTokenManager->getEmailFromToken($token);
    }
}
