<?php

namespace App\Tests\Integration;

use App\Equipment\Domain\Equipment;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class EquipmentApiTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $kernel = self::bootKernel();
        /** @var EntityManagerInterface $entityManager */
        $entityManager = $kernel->getContainer()->get('doctrine.orm.entity_manager');

        $metadata = $entityManager->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($entityManager);

        if ($metadata !== []) {
            $schemaTool->dropSchema($metadata);
            $schemaTool->createSchema($metadata);
        }

        $entityManager->persist(new Equipment('Zebra Scanner', 'EQ-SCN-001'));
        $entityManager->persist(new Equipment('Apple MacBook Pro', 'EQ-LAP-002'));
        $entityManager->flush();

        self::ensureKernelShutdown();
    }

    public function testListEquipmentReturnsOrderedItemsWithExpectedShape(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/equipment');

        self::assertResponseStatusCodeSame(Response::HTTP_OK);
        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        self::assertIsArray($payload);
        self::assertCount(2, $payload);
        self::assertSame('Apple MacBook Pro', $payload[0]['name'] ?? '');
        self::assertSame('EQ-LAP-002', $payload[0]['reference'] ?? '');
        self::assertIsInt($payload[0]['id'] ?? null);
        self::assertSame('Zebra Scanner', $payload[1]['name'] ?? '');
        self::assertSame('EQ-SCN-001', $payload[1]['reference'] ?? '');
        self::assertIsInt($payload[1]['id'] ?? null);
    }
}
