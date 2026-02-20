<?php

namespace App\Reservation\Application\ListReservations;

use App\Reservation\Domain\ReservationRepositoryInterface;

class ListReservationsService
{
    public function __construct(private readonly ReservationRepositoryInterface $reservationRepository)
    {
    }

    /**
     * @return list<array{id:int,email:string,startDate:string,endDate:string,equipment:array{id:int,name:string,reference:string}}>
     */
    public function handle(string $userEmail): array
    {
        $reservations = $this->reservationRepository->findByUserEmail($userEmail);

        return array_map(static function ($reservation): array {
            $equipment = $reservation->getEquipment();

            return [
                'id' => $reservation->getId() ?? 0,
                'email' => $reservation->getUserEmail(),
                'startDate' => $reservation->getStartDate()->format(DATE_ATOM),
                'endDate' => $reservation->getEndDate()->format(DATE_ATOM),
                'equipment' => [
                    'id' => $equipment->getId() ?? 0,
                    'name' => $equipment->getName(),
                    'reference' => $equipment->getReference(),
                ],
            ];
        }, $reservations);
    }
}
