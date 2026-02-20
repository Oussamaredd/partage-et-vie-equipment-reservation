<?php

namespace App\Reservation\Application\CreateReservation;

class CreateReservationInput
{
    public function __construct(
        public readonly int $equipmentId,
        public readonly string $userEmail,
        public readonly string $startDate,
        public readonly string $endDate,
    ) {
    }
}
