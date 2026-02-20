<?php

namespace App\Reservation\Application\CreateReservation;

use App\Equipment\Domain\EquipmentRepositoryInterface;
use App\Reservation\Domain\Exception\InvalidReservationDates;
use App\Reservation\Domain\Exception\ReservationConflict;
use App\Reservation\Domain\Reservation;
use App\Reservation\Domain\ReservationRepositoryInterface;
use DateTimeImmutable;
use InvalidArgumentException;

class CreateReservationService
{
    // Dependency injection of repositories
    public function __construct(
        private readonly EquipmentRepositoryInterface $equipmentRepository,
        private readonly ReservationRepositoryInterface $reservationRepository,
    ) {
    }
    
    public function handle(CreateReservationInput $input): CreateReservationResult
    {
        // Validate input
        $equipment = $this->equipmentRepository->findById($input->equipmentId);

        if ($equipment === null) {
            throw new InvalidArgumentException('Equipment not found.');
        }

        // Check for overlapping reservations
        $startDate = $this->parseDate($input->startDate);
        // Check if end date is after start date
        $endDate = $this->parseDate($input->endDate);
        
        if ($endDate <= $startDate) {
            throw new InvalidReservationDates('End date must be after start date.');
        }

        if ($this->reservationRepository->hasOverlap($equipment, $startDate, $endDate)) {
            throw new ReservationConflict('Equipment is already reserved for this period.');
        }

        // Create and save reservation
        $reservation = Reservation::create(
            $equipment,
            trim($input->userEmail),
            $startDate,
            $endDate,
        );
        
        $this->reservationRepository->save($reservation);
        
        return new CreateReservationResult(
            $reservation->getId() ?? 0,
            'Reservation created successfully.',
        );
    }
    // Parse date strings
    private function parseDate(string $value): DateTimeImmutable
    {
        try {
            return new DateTimeImmutable($value);
        } catch (\Throwable) {
            throw new InvalidArgumentException(sprintf('Invalid date format: %s', $value));
        }
    }
}
