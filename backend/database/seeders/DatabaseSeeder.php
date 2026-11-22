<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /** Safe to run on every container start; both seeders are idempotent. */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            FeaturedProductSeeder::class,
        ]);
    }
}
