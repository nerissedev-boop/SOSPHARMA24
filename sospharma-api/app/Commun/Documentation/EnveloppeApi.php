<?php

declare(strict_types=1);

namespace App\Commun\Documentation;

use App\Commun\Erreurs\CodeErreur;
use Dedoc\Scramble\Contracts\DocumentTransformer;
use Dedoc\Scramble\OpenApiContext;
use Dedoc\Scramble\Support\Generator\OpenApi;
use Dedoc\Scramble\Support\Generator\Operation;
use Dedoc\Scramble\Support\Generator\Reference;
use Dedoc\Scramble\Support\Generator\Response;
use Dedoc\Scramble\Support\Generator\Schema;
use Dedoc\Scramble\Support\Generator\Types\ArrayType;
use Dedoc\Scramble\Support\Generator\Types\BooleanType;
use Dedoc\Scramble\Support\Generator\Types\IntegerType;
use Dedoc\Scramble\Support\Generator\Types\MixedType;
use Dedoc\Scramble\Support\Generator\Types\ObjectType;
use Dedoc\Scramble\Support\Generator\Types\StringType;
use Dedoc\Scramble\Support\Generator\Types\Type;

/**
 * Extension Scramble : ajoute au contrat OpenAPI l'enveloppe standard (success / data / error / meta)
 * et la liste fermée des codes d'erreur, pour qu'elles soient présentes dans les clients générés.
 */
final class EnveloppeApi implements DocumentTransformer
{
    private const JSON = 'application/json';

    public function handle(OpenApi $document, OpenApiContext $context): void
    {
        $composants = $document->components;
        $meta = $composants->addSchema('Meta', Schema::fromType($this->meta()));
        $erreur = $composants->addSchema('ErreurApi', Schema::fromType($this->erreur($meta)));
        $composants->addSchema('CodeErreur', Schema::fromType(
            (new StringType)->enum(array_column(CodeErreur::cases(), 'value'))->setDescription('Liste fermée des codes d\'erreur de l\'API.')
        ));

        foreach ($document->paths as $chemin) {
            foreach ($chemin->operations as $operation) {
                $this->envelopperSucces($operation, $meta);
                $this->ajouterErreurs($operation, $erreur);
            }
        }
    }

    private function envelopperSucces(Operation $operation, Reference $meta): void
    {
        $aUnSucces = false;
        foreach ($operation->responses ?? [] as $reponse) {
            if (! $reponse instanceof Response || (int) $reponse->code < 200 || (int) $reponse->code >= 300) {
                continue;
            }
            $aUnSucces = true;
            if (! isset($reponse->content[self::JSON])) {
                continue;
            }
            $schema = $reponse->getContent(self::JSON);
            $type = $schema instanceof Schema ? $schema->type : ($schema instanceof Reference ? $schema : null);
            if ($type instanceof ObjectType && $type->hasProperty('success')) {
                continue; // déjà enveloppé (inféré depuis ApiResponse)
            }
            $reponse->setContent(self::JSON, Schema::fromType($this->succes($type ?? new MixedType, $meta)));
        }

        if (! $aUnSucces) {
            $operation->addResponse(Response::make(200)->setDescription('Succès')
                ->setContent(self::JSON, Schema::fromType($this->succes(new MixedType, $meta))));
        }
    }

    private function ajouterErreurs(Operation $operation, Reference $erreur): void
    {
        $existants = [];
        foreach ($operation->responses ?? [] as $reponse) {
            if ($reponse instanceof Response) {
                $existants[(int) $reponse->code] = $reponse;
            }
        }

        $parStatut = [];
        foreach (CodeErreur::cases() as $code) {
            $parStatut[$code->statutHttp()][] = $code->value;
        }

        foreach ($parStatut as $statut => $codes) {
            $description = 'Erreur ('.implode(', ', $codes).')';
            if (isset($existants[$statut])) {
                $existants[$statut]->setDescription($description)->setContent(self::JSON, Schema::fromType($erreur));

                continue;
            }
            $operation->addResponse(Response::make($statut)->setDescription($description)->setContent(self::JSON, Schema::fromType($erreur)));
        }
    }

    private function succes(Type $data, Reference $meta): ObjectType
    {
        $objet = new ObjectType;
        $objet->addProperty('success', (new BooleanType)->enum([true]));
        $objet->addProperty('data', $data);
        $objet->addProperty('meta', $meta);
        $objet->setRequired(['success', 'data', 'meta']);

        return $objet;
    }

    private function meta(): ObjectType
    {
        $pagination = new ObjectType;
        foreach (['page', 'per_page', 'total', 'last_page'] as $champ) {
            $pagination->addProperty($champ, new IntegerType);
        }

        $meta = new ObjectType;
        $meta->addProperty('request_id', (new StringType)->setDescription('À citer au support : retrouve la requête dans les journaux.'));
        $meta->addProperty('generated_at', (new StringType)->format('date-time'));
        $meta->addProperty('pagination', $pagination->setDescription('Tableaux du back-office (pagination par page).'));
        $meta->addProperty('rayon', (new IntegerType)->nullable(true)->setDescription('Listes de l\'app : rayon en mètres.'));
        $meta->addProperty('limite', (new IntegerType)->setDescription('Listes de l\'app : nombre maximal de résultats.'));
        $meta->addProperty('nombre', (new IntegerType)->setDescription('Nombre de résultats renvoyés.'));
        $meta->addProperty('tronque', (new BooleanType)->setDescription('Carte : vrai si le plafond de 300 points est atteint.'));
        $meta->addProperty('per_page', new IntegerType);
        $meta->addProperty('next_cursor', (new StringType)->nullable(true)->setDescription('Historiques : curseur de la page suivante.'));
        $meta->addProperty('prev_cursor', (new StringType)->nullable(true));
        $meta->setRequired(['request_id', 'generated_at']);

        return $meta;
    }

    private function erreur(Reference $meta): ObjectType
    {
        $details = new ObjectType;
        $details->additionalProperties((new ArrayType)->setItems(new StringType));
        $details->setDescription('Erreurs par champ (formulaires) ou par ligne (imports).');

        $contenu = new ObjectType;
        $contenu->addProperty('code', (new StringType)->enum(array_column(CodeErreur::cases(), 'value')));
        $contenu->addProperty('message', (new StringType)->setDescription('Message en français, affichable tel quel.'));
        $contenu->addProperty('details', $details);
        $contenu->setRequired(['code', 'message']);

        $objet = new ObjectType;
        $objet->addProperty('success', (new BooleanType)->enum([false]));
        $objet->addProperty('error', $contenu);
        $objet->addProperty('meta', $meta);
        $objet->setRequired(['success', 'error', 'meta']);

        return $objet;
    }
}
