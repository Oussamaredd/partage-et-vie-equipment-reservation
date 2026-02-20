<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

/**
 * Auto-generated Migration: Please modify to your needs!
 */
final class Version20260220165021 extends AbstractMigration
{
    public function getDescription(): string
    {
        return '';
    }

    public function up(Schema $schema): void
    {
        // this up() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TEMPORARY TABLE __temp__password_reset_token AS SELECT id, token_hash, expires_at, used_at, created_at, user_id FROM password_reset_token');
        $this->addSql('DROP TABLE password_reset_token');
        $this->addSql('CREATE TABLE password_reset_token (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, user_id INTEGER NOT NULL, CONSTRAINT FK_6B7BA4B6A76ED395 FOREIGN KEY (user_id) REFERENCES app_user (id) ON UPDATE NO ACTION ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('INSERT INTO password_reset_token (id, token_hash, expires_at, used_at, created_at, user_id) SELECT id, token_hash, expires_at, used_at, created_at, user_id FROM __temp__password_reset_token');
        $this->addSql('DROP TABLE __temp__password_reset_token');
        $this->addSql('CREATE UNIQUE INDEX uniq_password_reset_token_hash ON password_reset_token (token_hash)');
        $this->addSql('CREATE INDEX IDX_6B7BA4B6A76ED395 ON password_reset_token (user_id)');
        $this->addSql('CREATE INDEX idx_password_reset_token_expires_at ON password_reset_token (expires_at)');
        $this->addSql('CREATE INDEX idx_password_reset_token_used_at ON password_reset_token (used_at)');
    }

    public function down(Schema $schema): void
    {
        // this down() migration is auto-generated, please modify it to your needs
        $this->addSql('CREATE TEMPORARY TABLE __temp__password_reset_token AS SELECT id, token_hash, expires_at, used_at, created_at, user_id FROM password_reset_token');
        $this->addSql('DROP TABLE password_reset_token');
        $this->addSql('CREATE TABLE password_reset_token (id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, token_hash VARCHAR(64) NOT NULL, expires_at DATETIME NOT NULL, used_at DATETIME DEFAULT NULL, created_at DATETIME NOT NULL, user_id INTEGER NOT NULL, CONSTRAINT FK_6B7BA4B6A76ED395 FOREIGN KEY (user_id) REFERENCES app_user (id) ON DELETE CASCADE NOT DEFERRABLE INITIALLY IMMEDIATE)');
        $this->addSql('INSERT INTO password_reset_token (id, token_hash, expires_at, used_at, created_at, user_id) SELECT id, token_hash, expires_at, used_at, created_at, user_id FROM __temp__password_reset_token');
        $this->addSql('DROP TABLE __temp__password_reset_token');
        $this->addSql('CREATE INDEX IDX_6B7BA4B6A76ED395 ON password_reset_token (user_id)');
        $this->addSql('CREATE UNIQUE INDEX uniq_password_reset_token_hash ON password_reset_token (token_hash)');
    }
}
