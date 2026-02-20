<?php

namespace App\Tests\Unit\Reservation;

use App\Equipment\Domain\Equipment;
use App\Reservation\Domain\Exception\InvalidReservationDates;
use App\Reservation\Domain\Reservation;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;

class ReservationDateValidationTest extends TestCase
{
    public function testItRejectsEndDateBeforeStartDate(): void
    {
        $equipment = new Equipment('Laptop', 'EQ-TEST-001');

        $this->expectException(InvalidReservationDates::class);

        Reservation::create(
            $equipment,
            'user@example.test',
            new DateTimeImmutable('2026-03-12 10:00:00'),
            new DateTimeImmutable('2026-03-10 10:00:00'),
        );
    }
}
