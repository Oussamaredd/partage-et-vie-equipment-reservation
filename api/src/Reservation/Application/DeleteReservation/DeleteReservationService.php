<?php

namespace App\Reservation\Application\DeleteReservation;

use App\Reservation\Domain\ReservationRepositoryInterface;

class DeleteReservationService
{
    public function __construct(private readonly ReservationRepositoryInterface $reservationRepository)
    {
    }

    public function handle(int $reservationId, string $userEmail): bool
    {
        return $this->reservationRepository->deleteByIdAndUserEmail($reservationId, trim($userEmail));
    }
}
