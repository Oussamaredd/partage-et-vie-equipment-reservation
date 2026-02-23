<?php

namespace App\Tests\Unit\Reservation;

use App\Equipment\Domain\Equipment;
use App\Reservation\Application\DeleteReservation\DeleteReservationService;
use App\Reservation\Domain\Reservation;
use App\Reservation\Domain\ReservationRepositoryInterface;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class DeleteReservationServiceTest extends TestCase
{
    public function testItReturnsTrueWhenReservationIsDeleted(): void
    {
        $captured = (object) ['reservationId' => null, 'userEmail' => null];
        $repository = new class($captured) implements ReservationRepositoryInterface {
            public function __construct(private object $captured)
            {
            }

            public function save(Reservation $reservation): void
            {
            }

            public function deleteByIdAndUserEmail(int $reservationId, string $userEmail): bool
            {
                $this->captured->reservationId = $reservationId;
                $this->captured->userEmail = $userEmail;

                return true;
            }

            public function hasOverlap(Equipment $equipment, DateTimeImmutable $startDate, DateTimeImmutable $endDate): bool
            {
                return false;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new DeleteReservationService($repository);
        $result = $service->handle(27, '  employee@company.test  ');

        self::assertTrue($result);
        self::assertSame(27, $captured->reservationId);
        self::assertSame('employee@company.test', $captured->userEmail);
    }

    public function testItReturnsFalseWhenReservationCannotBeDeleted(): void
    {
        $repository = new class implements ReservationRepositoryInterface {
            public function save(Reservation $reservation): void
            {
            }

            public function deleteByIdAndUserEmail(int $reservationId, string $userEmail): bool
            {
                return false;
            }

            public function hasOverlap(Equipment $equipment, DateTimeImmutable $startDate, DateTimeImmutable $endDate): bool
            {
                return false;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new DeleteReservationService($repository);

        self::assertFalse($service->handle(999, 'employee@company.test'));
    }
}
