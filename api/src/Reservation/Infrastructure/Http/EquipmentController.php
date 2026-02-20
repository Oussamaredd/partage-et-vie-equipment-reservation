<?php

namespace App\Reservation\Infrastructure\Http;

use App\Equipment\Domain\EquipmentRepositoryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class EquipmentController extends AbstractController
{
    #[Route('/api/equipment', name: 'api_equipment_list', methods: ['GET'])]
    public function __invoke(EquipmentRepositoryInterface $equipmentRepository): JsonResponse
    {
        $items = array_map(static fn ($equipment): array => [
            'id' => $equipment->getId(),
            'name' => $equipment->getName(),
            'reference' => $equipment->getReference(),
        ], $equipmentRepository->findAllOrderedByName());

        return $this->json($items);
    }
}
