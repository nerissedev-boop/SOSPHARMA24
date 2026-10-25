<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Coordonnées du support par pays (écran « Nous contacter » de l'app) : WhatsApp, téléphone, e-mail.
 * Vides tant que l'équipe ne les a pas renseignées ; l'app affiche alors « bientôt disponible ».
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pays', function (Blueprint $table): void {
            $table->string('support_whatsapp', 20)->nullable()->after('langues')->comment('Format E.164, ex. +2250102030405');
            $table->string('support_telephone', 20)->nullable()->after('support_whatsapp')->comment('Format E.164');
            $table->string('support_email', 150)->nullable()->after('support_telephone');
        });
    }

    public function down(): void
    {
        Schema::table('pays', function (Blueprint $table): void {
            $table->dropColumn(['support_whatsapp', 'support_telephone', 'support_email']);
        });
    }
};
