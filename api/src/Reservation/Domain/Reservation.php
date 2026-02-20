<?php

namespace App\Reservation\Domain;

use App\Equipment\Domain\Equipment;
use App\Reservation\Domain\Exception\InvalidReservationDates;
use DateTimeImmutable;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'reservation')]
class Reservation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $startDate;

    #[ORM\Column(type: 'datetime_immutable')]
    private DateTimeImmutable $endDate;

    #[ORM\Column(length: 255)]
    private string $userEmail;

    #[ORM\ManyToOne(targetEntity: Equipment::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Equipment $equipment;

    private function __construct(
        Equipment $equipment,
        string $userEmail,
        DateTimeImmutable $startDate,
        DateTimeImmutable $endDate,
    ) {
        if ($endDate <= $startDate) {
            throw new InvalidReservationDates('End date must be after start date.');
        }

        $this->equipment = $equipment;
        $this->userEmail = $userEmail;
        $this->startDate = $startDate;
        $this->endDate = $endDate;
    }

    public static function create(
        Equipment $equipment,
        string $userEmail,
        DateTimeImmutable $startDate,
        DateTimeImmutable $endDate,
    ): self {
        return new self($equipment, $userEmail, $startDate, $endDate);
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getStartDate(): DateTimeImmutable
    {
        return $this->startDate;
    }

    public function getEndDate(): DateTimeImmutable
    {
        return $this->endDate;
    }

    public function getUserEmail(): string
    {
        return $this->userEmail;
    }

    public function getEquipment(): Equipment
    {
        return $this->equipment;
    }
}
