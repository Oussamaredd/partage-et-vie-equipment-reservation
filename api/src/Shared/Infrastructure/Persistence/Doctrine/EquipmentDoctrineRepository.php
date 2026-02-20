<?php

namespace App\Shared\Infrastructure\Persistence\Doctrine;

use App\Equipment\Domain\Equipment;
use App\Equipment\Domain\EquipmentRepositoryInterface;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class EquipmentDoctrineRepository extends ServiceEntityRepository implements EquipmentRepositoryInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Equipment::class);
    }

    public function findById(int $id): ?Equipment
    {
        return $this->find($id);
    }

    public function findAllOrderedByName(): array
    {
        return $this->createQueryBuilder('e')
            ->orderBy('e.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function save(Equipment $equipment): void
    {
        $this->getEntityManager()->persist($equipment);
        $this->getEntityManager()->flush();
    }
}
