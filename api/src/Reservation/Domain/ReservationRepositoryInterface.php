<?php

namespace App\Reservation\Domain;

use App\Equipment\Domain\Equipment;
use DateTimeImmutable;

interface ReservationRepositoryInterface
{
    public function save(Reservation $reservation): void;

    public function deleteByIdAndUserEmail(int $reservationId, string $userEmail): bool;

    public function hasOverlap(Equipment $equipment, DateTimeImmutable $startDate, DateTimeImmutable $endDate): bool;

    /**
     * @return list<Reservation>
     */
    public function findByUserEmail(string $userEmail): array;
}
