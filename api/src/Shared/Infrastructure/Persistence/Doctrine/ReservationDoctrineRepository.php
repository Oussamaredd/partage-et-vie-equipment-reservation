<?php

namespace App\Shared\Infrastructure\Persistence\Doctrine;

use App\Equipment\Domain\Equipment;
use App\Reservation\Domain\Reservation;
use App\Reservation\Domain\ReservationRepositoryInterface;
use DateTimeImmutable;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class ReservationDoctrineRepository extends ServiceEntityRepository implements ReservationRepositoryInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Reservation::class);
    }

    public function save(Reservation $reservation): void
    {
        $this->getEntityManager()->persist($reservation);
        $this->getEntityManager()->flush();
    }

    public function deleteByIdAndUserEmail(int $reservationId, string $userEmail): bool
    {
        $deleted = $this->createQueryBuilder('r')
            ->delete()
            ->andWhere('r.id = :id')
            ->andWhere('r.userEmail = :userEmail')
            ->setParameter('id', $reservationId)
            ->setParameter('userEmail', $userEmail)
            ->getQuery()
            ->execute();

        return $deleted > 0;
    }

    public function hasOverlap(Equipment $equipment, DateTimeImmutable $startDate, DateTimeImmutable $endDate): bool
    {
        $conflict = $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.equipment = :equipment')
            ->andWhere('r.startDate < :endDate')
            ->andWhere('r.endDate > :startDate')
            ->setParameter('equipment', $equipment)
            ->setParameter('startDate', $startDate)
            ->setParameter('endDate', $endDate)
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $conflict > 0;
    }

    public function findByUserEmail(string $userEmail): array
    {
        return $this->createQueryBuilder('r')
            ->innerJoin('r.equipment', 'e')
            ->addSelect('e')
            ->andWhere('r.userEmail = :userEmail')
            ->setParameter('userEmail', $userEmail)
            ->orderBy('r.startDate', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
