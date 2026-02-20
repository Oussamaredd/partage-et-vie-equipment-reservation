<?php

namespace App\Reservation\Application\CreateReservation;

class CreateReservationResult
{
    public function __construct(
        public readonly int $id,
        public readonly string $message,
    ) {
    }
}
