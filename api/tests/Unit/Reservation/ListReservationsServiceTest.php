<?php

namespace App\Tests\Unit\Reservation;

use App\Equipment\Domain\Equipment;
use App\Reservation\Application\ListReservations\ListReservationsService;
use App\Reservation\Domain\Reservation;
use App\Reservation\Domain\ReservationRepositoryInterface;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class ListReservationsServiceTest extends TestCase
{
    public function testItReturnsMappedReservationList(): void
    {
        $equipment = new Equipment('Sony Alpha 7C', 'EQ-CAM-001');

        $reservation = Reservation::create(
            $equipment,
            'employee@company.test',
            new DateTimeImmutable('2026-03-10 09:00:00'),
            new DateTimeImmutable('2026-03-10 18:00:00'),
        );

        $repository = new class($reservation) implements ReservationRepositoryInterface {
            public function __construct(private Reservation $reservation)
            {
            }

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
                return [$this->reservation];
            }
        };

        $service = new ListReservationsService($repository);
        $result = $service->handle('employee@company.test');

        self::assertSame([
            [
                'id' => 0,
                'email' => 'employee@company.test',
                'startDate' => '2026-03-10T09:00:00+00:00',
                'endDate' => '2026-03-10T18:00:00+00:00',
                'equipment' => [
                    'id' => 0,
                    'name' => 'Sony Alpha 7C',
                    'reference' => 'EQ-CAM-001',
                ],
            ],
        ], $result);
    }

    public function testItReturnsEmptyArrayWhenNoReservationExists(): void
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

        $service = new ListReservationsService($repository);

        self::assertSame([], $service->handle('employee@company.test'));
    }
}
