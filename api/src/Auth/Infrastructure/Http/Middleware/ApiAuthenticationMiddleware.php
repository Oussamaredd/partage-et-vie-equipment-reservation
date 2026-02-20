<?php

namespace App\Auth\Infrastructure\Http\Middleware;

use App\Auth\Infrastructure\Security\JwtTokenManager;
use InvalidArgumentException;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

class ApiAuthenticationMiddleware implements EventSubscriberInterface
{
    public function __construct(private readonly JwtTokenManager $jwtTokenManager)
    {
    }

    public static function getSubscribedEvents(): array
    {
        return [KernelEvents::REQUEST => ['onKernelRequest', 8]];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (!str_starts_with($request->getPathInfo(), '/api/reservations')) {
            return;
        }

        $header = (string) $request->headers->get('Authorization', '');
        if (!str_starts_with($header, 'Bearer ')) {
            $event->setResponse(new JsonResponse(['message' => 'Missing bearer token.'], JsonResponse::HTTP_UNAUTHORIZED));

            return;
        }

        try {
            $email = $this->jwtTokenManager->getEmailFromToken(trim(substr($header, 7)));
        } catch (InvalidArgumentException $exception) {
            $event->setResponse(new JsonResponse(['message' => $exception->getMessage()], JsonResponse::HTTP_UNAUTHORIZED));

            return;
        }

        $request->attributes->set('authenticated_email', $email);
    }
}
