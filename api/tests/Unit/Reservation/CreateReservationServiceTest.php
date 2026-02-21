<?php

namespace App\Tests\Unit\Reservation;

use App\Equipment\Domain\Equipment;
use App\Equipment\Domain\EquipmentRepositoryInterface;
use App\Reservation\Application\CreateReservation\CreateReservationInput;
use App\Reservation\Application\CreateReservation\CreateReservationService;
use App\Reservation\Domain\Exception\InvalidReservationDates;
use App\Reservation\Domain\Exception\ReservationConflict;
use App\Reservation\Domain\Reservation;
use App\Reservation\Domain\ReservationRepositoryInterface;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class CreateReservationServiceTest extends TestCase
{
    public function testItRejectsOverlappingReservation(): void
    {
        $equipment = new Equipment('Laptop', 'EQ-TEST-001');

        $equipmentRepository = $this->createEquipmentRepository($equipment);

        $reservationRepository = new class implements ReservationRepositoryInterface {
            public function save(Reservation $reservation): void
            {
            }

            public function deleteByIdAndUserEmail(int $reservationId, string $userEmail): bool
            {
                return false;
            }

            public function hasOverlap(Equipment $equipment, DateTimeImmutable $startDate, DateTimeImmutable $endDate): bool
            {
                return true;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new CreateReservationService($equipmentRepository, $reservationRepository);

        $this->expectException(ReservationConflict::class);

        $service->handle(new CreateReservationInput(
            1,
            'user@example.test',
            '2026-03-11 10:00:00',
            '2026-03-12 10:00:00',
        ));
    }

    public function testItRejectsInvalidDateRangeBeforeOverlapCheck(): void
    {
        $equipment = new Equipment('Laptop', 'EQ-TEST-001');
        $equipmentRepository = $this->createEquipmentRepository($equipment);
        $tracker = (object) ['hasOverlapCalled' => false];

        $reservationRepository = new class($tracker) implements ReservationRepositoryInterface {
            public function __construct(private object $tracker)
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
                $this->tracker->hasOverlapCalled = true;
                return true;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new CreateReservationService($equipmentRepository, $reservationRepository);

        try {
            $service->handle(new CreateReservationInput(
                1,
                'user@example.test',
                '2026-03-12 10:00:00',
                '2026-03-11 10:00:00',
            ));
            self::fail('Expected InvalidReservationDates to be thrown.');
        } catch (InvalidReservationDates) {
            self::assertFalse($tracker->hasOverlapCalled, 'hasOverlap should not be called for invalid date ranges.');
        }
    }

    private function createEquipmentRepository(Equipment $equipment): EquipmentRepositoryInterface
    {
        return new class($equipment) implements EquipmentRepositoryInterface {
            public function __construct(private readonly Equipment $equipment)
            {
            }

            public function findById(int $id): ?Equipment
            {
                return $this->equipment;
            }

            public function findAllOrderedByName(): array
            {
                return [$this->equipment];
            }

            public function save(Equipment $equipment): void
            {
            }
        };
    }
}
