<?php

namespace App\Equipment\Domain;

interface EquipmentRepositoryInterface
{
    public function findById(int $id): ?Equipment;

    /**
     * @return list<Equipment>
     */
    public function findAllOrderedByName(): array;

    public function save(Equipment $equipment): void;
}
