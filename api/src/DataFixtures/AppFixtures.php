<?php

namespace App\DataFixtures;

use App\Auth\Domain\User;
use App\Equipment\Domain\Equipment;
use App\Reservation\Domain\Reservation;
use DateTimeImmutable;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class AppFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $laptop = new Equipment('Dell Latitude 7440', 'EQ-LAP-001');
        $camera = new Equipment('Sony Alpha 7C', 'EQ-CAM-001');
        $projector = new Equipment('Epson EB-FH06', 'EQ-PROJ-001');

        $manager->persist($laptop);
        $manager->persist($camera);
        $manager->persist($projector);
        $manager->persist(User::create('employee@company.test', password_hash('ChangeMe123', PASSWORD_ARGON2ID)));
        $manager->persist(User::create('employee2@company.test', password_hash('ChangeMe123', PASSWORD_ARGON2ID)));

        $manager->persist(Reservation::create(
            $laptop,
            'alice@company.test',
            new DateTimeImmutable('2026-03-10 09:00:00'),
            new DateTimeImmutable('2026-03-12 18:00:00')
        ));

        $manager->persist(Reservation::create(
            $camera,
            'bob@company.test',
            new DateTimeImmutable('2026-03-15 10:00:00'),
            new DateTimeImmutable('2026-03-16 17:00:00')
        ));

        $manager->flush();
    }
}
