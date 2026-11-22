<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_log_in_and_receives_a_session(): void
    {
        $user = User::factory()->create(['password' => 'secret-password']);

        $this->fromSpa()
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'secret-password'])
            ->assertOk()
            ->assertJsonPath('data.email', $user->email)
            ->assertJsonMissingPath('data.password');

        $this->assertAuthenticatedAs($user, 'web');
        $this->fromSpa()->getJson('/api/user')->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_wrong_credentials_are_rejected_without_revealing_which_field(): void
    {
        $user = User::factory()->create();

        $this->fromSpa()
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['email' => 'These credentials do not match our records.']);

        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited(): void
    {
        $user = User::factory()->create();

        foreach (range(1, 5) as $_) {
            $this->fromSpa()->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong']);
        }

        $this->fromSpa()
            ->postJson('/api/login', ['email' => $user->email, 'password' => 'wrong'])
            ->assertTooManyRequests();
    }

    public function test_guests_get_401_json_not_a_redirect(): void
    {
        $this->fromSpa()->getJson('/api/user')->assertUnauthorized();
    }

    public function test_admin_can_log_out(): void
    {
        $this->actingAs(User::factory()->create());

        $this->fromSpa()->postJson('/api/logout')->assertNoContent();

        $this->assertGuest('web');
    }
}
