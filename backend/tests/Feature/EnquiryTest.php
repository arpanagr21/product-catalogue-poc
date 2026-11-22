<?php

namespace Tests\Feature;

use App\Mail\EnquiryReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EnquiryTest extends TestCase
{
    use RefreshDatabase;

    private array $valid = [
        'product_id' => '3',
        'name' => 'Ada Lovelace',
        'email' => 'ada@example.com',
        'phone' => '+44 20 7946 0958',
        'message' => 'Do you have this in navy?',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->fakeCatalogue();
        Mail::fake();
        config(['catalogue.sales_inbox' => 'sales@shop.test']);
    }

    public function test_submitting_an_enquiry_emails_the_sales_inbox_and_thanks_the_customer(): void
    {
        $this->postJson('/api/enquiries', $this->valid)
            ->assertCreated()
            ->assertJsonPath('message', 'Thank you! Our sales team will be in touch shortly.');

        $this->assertDatabaseHas('enquiries', [
            'product_id' => '3',
            'product_title' => 'Mens Cotton Jacket',
            'email' => 'ada@example.com',
        ]);

        Mail::assertQueued(EnquiryReceived::class, function (EnquiryReceived $mail) {
            return $mail->hasTo('sales@shop.test')
                && $mail->hasReplyTo('ada@example.com')
                && $mail->hasSubject('New enquiry: Mens Cotton Jacket');
        });
    }

    public function test_the_email_contains_the_customer_details(): void
    {
        $this->postJson('/api/enquiries', $this->valid)->assertCreated();

        Mail::assertQueued(EnquiryReceived::class, function (EnquiryReceived $mail) {
            $mail->assertSeeInHtml('Ada Lovelace')
                ->assertSeeInHtml('+44 20 7946 0958')
                ->assertSeeInHtml('Do you have this in navy?');

            return true;
        });
    }

    public function test_phone_and_message_are_optional(): void
    {
        $this->postJson('/api/enquiries', [...$this->valid, 'phone' => null, 'message' => null])
            ->assertCreated();
    }

    public function test_contact_details_are_validated(): void
    {
        $this->postJson('/api/enquiries', ['product_id' => '3', 'email' => 'not-an-email', 'phone' => 'call me'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name', 'email', 'phone']);

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('enquiries', 0);
    }

    public function test_enquiring_about_an_unknown_product_is_rejected(): void
    {
        $this->postJson('/api/enquiries', [...$this->valid, 'product_id' => '999'])
            ->assertJsonValidationErrors(['product_id' => 'This product is no longer available.']);

        Mail::assertNothingQueued();
    }

    public function test_user_input_is_escaped_in_the_email(): void
    {
        $this->postJson('/api/enquiries', [...$this->valid, 'name' => '<script>alert(1)</script>'])->assertCreated();

        Mail::assertQueued(EnquiryReceived::class, function (EnquiryReceived $mail) {
            $mail->assertDontSeeInHtml('<script>alert(1)</script>', false);

            return true;
        });
    }
}
