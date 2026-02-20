<?php

namespace App\Tests\Integration;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\HttpFoundation\Response;

class AuthApiTest extends WebTestCase
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

        self::ensureKernelShutdown();
    }

    public function testSignupSuccessAndConflict(): void
    {
        $client = static::createClient();
        $client->request(
            'POST',
            '/api/auth/signup',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'new.user@company.test',
                'password' => 'Password123',
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_CREATED);

        $client->request(
            'POST',
            '/api/auth/signup',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'new.user@company.test',
                'password' => 'Password123',
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_CONFLICT);
    }

    public function testLoginSuccessAndInvalidCredential(): void
    {
        $client = static::createClient();
        $this->signupUser($client, 'login.user@company.test', 'Password123');

        $client->request(
            'POST',
            '/api/auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'login.user@company.test',
                'password' => 'Password123',
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $client->request(
            'POST',
            '/api/auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'login.user@company.test',
                'password' => 'Wrong1234',
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_UNAUTHORIZED);
    }

    public function testForgotAndResetPasswordFlow(): void
    {
        $client = static::createClient();
        $this->signupUser($client, 'forgot.user@company.test', 'Password123');

        $client->request(
            'POST',
            '/api/auth/forgot-password',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['email' => 'forgot.user@company.test'], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $payload = json_decode((string) $client->getResponse()->getContent(), true, 512, JSON_THROW_ON_ERROR);
        $token = (string) ($payload['resetToken'] ?? '');
        self::assertNotSame('', $token);

        $client->request(
            'POST',
            '/api/auth/reset-password',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'token' => $token,
                'newPassword' => 'NewPassword123',
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);

        $client->request(
            'POST',
            '/api/auth/login',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode([
                'email' => 'forgot.user@company.test',
                'password' => 'NewPassword123',
            ], JSON_THROW_ON_ERROR)
        );
        self::assertResponseStatusCodeSame(Response::HTTP_OK);
    }

    private function signupUser(KernelBrowser $client, string $email, string $password): void
    {
        $client->request(
            'POST',
            '/api/auth/signup',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['email' => $email, 'password' => $password], JSON_THROW_ON_ERROR)
        );
    }
}
