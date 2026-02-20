<?php

namespace App\Tests\Integration;

use App\Auth\Domain\User;
use App\Equipment\Domain\Equipment;
use App\Reservation\Domain\Reservation;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class ReservationApiTest extends WebTestCase
{
    protected function setUp(): void
    {
        self::ensureKernelShutdown();
        $kernel = self::bootKernel();
        /** @var EntityManagerInterface $entityManager */
        $entityManager = $kernel->getContainer()->get('doctrine.orm.entity_manager');

        $this->resetDatabase($entityManager);
        $this->loadFixtures($entityManager);

        self::ensureKernelShutdown();
    }

    public function testCreateReservationRequiresAuthentication(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/reservations',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'equipmentId' => 1,
                'startDate' => '2026-03-20 09:00:00',
                'endDate' => '2026-03-20 18:00:00',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateReservationRejectsInvalidToken(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/reservations',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => 'Bearer invalid-token',
            ],
            content: json_encode([
                'equipmentId' => 1,
                'startDate' => '2026-03-20 09:00:00',
                'endDate' => '2026-03-20 18:00:00',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testCreateReservationSuccess(): void
    {
        $client = static::createClient();
        $token = $this->loginAndGetToken($client);

        $client->request(
            'POST',
            '/api/reservations',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode([
                'equipmentId' => 1,
                'startDate' => '2026-03-20 09:00:00',
                'endDate' => '2026-03-20 18:00:00',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);
    }

    public function testCreateReservationConflict(): void
    {
        $client = static::createClient();
        $token = $this->loginAndGetToken($client);

        $client->request(
            'POST',
            '/api/reservations',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode([
                'equipmentId' => 1,
                'startDate' => '2026-03-10 10:00:00',
                'endDate' => '2026-03-10 16:00:00',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
    }

    public function testCreateReservationConflictWhenRequestedSlotWrapsExistingReservation(): void
    {
        $client = static::createClient();
        $token = $this->loginAndGetToken($client);

        $client->request(
            'POST',
            '/api/reservations',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode([
                'equipmentId' => 1,
                'startDate' => '2026-03-09 08:00:00',
                'endDate' => '2026-03-13 08:00:00',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
    }

    public function testCreateReservationInvalidDates(): void
    {
        $client = static::createClient();
        $token = $this->loginAndGetToken($client);

        $client->request(
            'POST',
            '/api/reservations',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_AUTHORIZATION' => sprintf('Bearer %s', $token),
            ],
            content: json_encode([
                'equipmentId' => 2,
                'startDate' => '2026-03-20 18:00:00',
                'endDate' => '2026-03-20 09:00:00',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_BAD_REQUEST);
    }

    private function resetDatabase(EntityManagerInterface $entityManager): void
    {
        $metadata = $entityManager->getMetadataFactory()->getAllMetadata();
        $schemaTool = new SchemaTool($entityManager);

        if ($metadata !== []) {
            $schemaTool->dropSchema($metadata);
            $schemaTool->createSchema($metadata);
        }
    }

    private function loadFixtures(EntityManagerInterface $entityManager): void
    {
        $laptop = new Equipment('Dell Latitude 7440', 'EQ-LAP-001');
        $camera = new Equipment('Sony Alpha 7C', 'EQ-CAM-001');

        $entityManager->persist($laptop);
        $entityManager->persist($camera);
        $entityManager->persist(User::create('employee@company.test', password_hash('ChangeMe123', PASSWORD_ARGON2ID)));
        $entityManager->flush();

        $entityManager->persist(Reservation::create(
            $laptop,
            'seed.user@company.test',
            new DateTimeImmutable('2026-03-10 09:00:00'),
            new DateTimeImmutable('2026-03-12 18:00:00')
        ));

        $entityManager->flush();
    }

    private function loginAndGetToken(KernelBrowser $client): string
    {
        $client->request(
            'POST',
            '/api/auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'employee@company.test',
                'password' => 'ChangeMe123',
            ], JSON_THROW_ON_ERROR)
        );

        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $response = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);

        return (string) ($response['token'] ?? '');
    }
}
