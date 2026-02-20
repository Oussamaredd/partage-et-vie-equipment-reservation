<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260220180500 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'Add reservation indexes for overlap and listing queries';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('CREATE INDEX idx_reservation_equipment_start_end ON reservation (equipment_id, start_date, end_date)');
        $this->addSql('CREATE INDEX idx_reservation_user_email_start_date ON reservation (user_email, start_date)');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP INDEX idx_reservation_equipment_start_end');
        $this->addSql('DROP INDEX idx_reservation_user_email_start_date');
    }
}
