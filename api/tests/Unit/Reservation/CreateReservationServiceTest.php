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
use InvalidArgumentException;
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

    public function testItCreatesReservationSuccessfully(): void
    {
        $equipment = new Equipment('Laptop', 'EQ-TEST-001');
        $equipmentRepository = $this->createEquipmentRepository($equipment);
        $savedReservation = (object) ['value' => null];

        $reservationRepository = new class($savedReservation) implements ReservationRepositoryInterface {
            public function __construct(private object $savedReservation)
            {
            }

            public function save(Reservation $reservation): void
            {
                $this->savedReservation->value = $reservation;
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

        $service = new CreateReservationService($equipmentRepository, $reservationRepository);
        $result = $service->handle(new CreateReservationInput(
            1,
            '  user@example.test  ',
            '2026-03-11 10:00:00',
            '2026-03-12 10:00:00',
        ));

        self::assertSame('Reservation created successfully.', $result->message);
        self::assertNotNull($savedReservation->value);
        self::assertSame('user@example.test', $savedReservation->value->getUserEmail());
        self::assertSame('2026-03-11T10:00:00+00:00', $savedReservation->value->getStartDate()->format(DATE_ATOM));
        self::assertSame('2026-03-12T10:00:00+00:00', $savedReservation->value->getEndDate()->format(DATE_ATOM));
    }

    public function testItRejectsUnknownEquipment(): void
    {
        $equipmentRepository = new class implements EquipmentRepositoryInterface {
            public function findById(int $id): ?Equipment
            {
                return null;
            }

            public function findAllOrderedByName(): array
            {
                return [];
            }

            public function save(Equipment $equipment): void
            {
            }
        };

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
                return false;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new CreateReservationService($equipmentRepository, $reservationRepository);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Equipment not found.');

        $service->handle(new CreateReservationInput(
            999,
            'user@example.test',
            '2026-03-11 10:00:00',
            '2026-03-12 10:00:00',
        ));
    }

    public function testItRejectsInvalidStartDateFormat(): void
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
                return false;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new CreateReservationService($equipmentRepository, $reservationRepository);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid date format: not-a-date');

        $service->handle(new CreateReservationInput(
            1,
            'user@example.test',
            'not-a-date',
            '2026-03-12 10:00:00',
        ));
    }

    public function testItRejectsInvalidEndDateFormat(): void
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
                return false;
            }

            public function findByUserEmail(string $userEmail): array
            {
                return [];
            }
        };

        $service = new CreateReservationService($equipmentRepository, $reservationRepository);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid date format: invalid-end');

        $service->handle(new CreateReservationInput(
            1,
            'user@example.test',
            '2026-03-12 10:00:00',
            'invalid-end',
        ));
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
