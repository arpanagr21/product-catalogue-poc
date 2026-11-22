<x-mail::message>
# New product enquiry

**Product:** {{ $enquiry->product_title }} (ID {{ $enquiry->product_id }})

**Name:** {{ $enquiry->name }}<br>
**Email:** {{ $enquiry->email }}<br>
**Phone:** {{ $enquiry->phone ?: 'Not provided' }}

@if ($enquiry->message)
**Message:**

{{ $enquiry->message }}
@endif

Reply to this email to respond to the customer directly.
</x-mail::message>
