<?php

namespace App\Auth\Infrastructure\Http;

use App\Auth\Application\Login\LoginInput;
use App\Auth\Application\Login\LoginService;
use App\Auth\Application\PasswordReset\RequestPasswordResetInput;
use App\Auth\Application\PasswordReset\RequestPasswordResetService;
use App\Auth\Application\PasswordReset\ResetPasswordInput;
use App\Auth\Application\PasswordReset\ResetPasswordService;
use App\Auth\Application\Signup\SignupInput;
use App\Auth\Application\Signup\SignupService;
use App\Auth\Domain\Exception\AuthConflict;
use App\Auth\Domain\Exception\ExpiredResetToken;
use App\Auth\Domain\Exception\InvalidCredentials;
use App\Auth\Domain\Exception\InvalidResetToken;
use InvalidArgumentException;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class AuthController extends AbstractController
{
    #[Route('/api/auth/signup', name: 'api_auth_signup', methods: ['POST'])]
    public function signup(Request $request, SignupService $signupService): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'Invalid JSON payload.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        try {
            $result = $signupService->handle(new SignupInput(
                (string) ($payload['email'] ?? ''),
                (string) ($payload['password'] ?? ''),
            ));
        } catch (InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        } catch (AuthConflict $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_CONFLICT);
        }

        return $this->json([
            'id' => $result->id,
            'email' => $result->email,
            'message' => $result->message,
        ], JsonResponse::HTTP_CREATED);
    }

    #[Route('/api/auth/login', name: 'api_auth_login', methods: ['POST'])]
    public function login(Request $request, LoginService $loginService): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'Invalid JSON payload.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        try {
            $result = $loginService->handle(new LoginInput(
                (string) ($payload['email'] ?? ''),
                (string) ($payload['password'] ?? ''),
            ));
        } catch (InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        } catch (InvalidCredentials $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_UNAUTHORIZED);
        }

        return $this->json([
            'token' => $result->token,
            'email' => $result->email,
        ]);
    }

    #[Route('/api/auth/forgot-password', name: 'api_auth_forgot_password', methods: ['POST'])]
    public function forgotPassword(Request $request, RequestPasswordResetService $service): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'Invalid JSON payload.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        $result = $service->handle(new RequestPasswordResetInput((string) ($payload['email'] ?? '')));

        return $this->json([
            'message' => $result->message,
            'resetToken' => $result->token,
        ]);
    }

    #[Route('/api/auth/reset-password', name: 'api_auth_reset_password', methods: ['POST'])]
    public function resetPassword(Request $request, ResetPasswordService $service): JsonResponse
    {
        $payload = json_decode($request->getContent(), true);
        if (!is_array($payload)) {
            return $this->json(['message' => 'Invalid JSON payload.'], JsonResponse::HTTP_BAD_REQUEST);
        }

        try {
            $service->handle(new ResetPasswordInput(
                (string) ($payload['token'] ?? ''),
                (string) ($payload['newPassword'] ?? ''),
            ));
        } catch (InvalidArgumentException $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        } catch (InvalidResetToken $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_BAD_REQUEST);
        } catch (ExpiredResetToken $exception) {
            return $this->json(['message' => $exception->getMessage()], JsonResponse::HTTP_GONE);
        }

        return $this->json(['message' => 'Password reset successfully.']);
    }
}
