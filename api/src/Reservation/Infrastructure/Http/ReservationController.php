<?php

namespace App\Reservation\Infrastructure\Http;

use App\Auth\Infrastructure\Security\AuthenticatedUserResolver;
use App\Reservation\Application\CreateReservation\CreateReservationInput;
use App\Reservation\Application\CreateReservation\CreateReservationService;
use App\Reservation\Application\ListReservations\ListReservationsService;
use App\Reservation\Domain\Exception\InvalidReservationDates;
use App\Reservation\Domain\Exception\ReservationConflict;
use InvalidArgumentException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class ReservationController extends AbstractController
{
    #[Route('/api/reservations', name: 'api_reservation_create', methods: ['POST'])]
    public function create(
        Request $request,
        CreateReservationService $service,
        AuthenticatedUserResolver $authenticatedUserResolver,
    ): JsonResponse
    {
        try {
            $userEmail = $authenticatedUserResolver->resolveEmail($request);
        } catch (InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_UNAUTHORIZED);
        }

        $payload = json_decode($request->getContent(), true);

        if (!is_array($payload)) {
            return $this->json(['message' => 'Invalid JSON payload.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        if (!isset($payload['equipmentId'], $payload['startDate'], $payload['endDate'])) {
            return $this->json(['message' => 'Missing required fields.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        try {
            $result = $service->handle(new CreateReservationInput(
                (int) $payload['equipmentId'],
                $userEmail,
                (string) $payload['startDate'],
                (string) $payload['endDate'],
            ));
        } catch (InvalidReservationDates|InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        } catch (ReservationConflict $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_CONFLICT);
        }

        return $this->json([
            'id' => $result->id,
            'message' => $result->message,
        ], JsonResponse::HTTP_CREATED);
    }

    #[Route('/api/reservations', name: 'api_reservation_list', methods: ['GET'])]
    public function list(
        Request $request,
        ListReservationsService $service,
        AuthenticatedUserResolver $authenticatedUserResolver,
    ): JsonResponse
    {
        try {
            $email = $authenticatedUserResolver->resolveEmail($request);
        } catch (InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_UNAUTHORIZED);
        }

        return $this->json($service->handle($email));
    }
}
